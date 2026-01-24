import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DataDiscrepancy {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  employee_id: string;
  employee_name: string;
  details: string;
  found_at: string;
}

interface ContractRow {
  id: string;
  employee_id: string;
  status: string;
  end_date: string | null;
  page1_url: string | null;
  page2_url: string | null;
  contract_type: string;
  employees: { full_name: string; status: string; contract_type: string } | null;
}

interface DocumentRow {
  id: string;
  name: string;
  expiry_date: string | null;
  is_renewed: boolean;
  employee_id: string;
  employees: { full_name: string }[] | null;
}

interface EmployeeRow {
  id: string;
  full_name: string;
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const discrepancies: DataDiscrepancy[] = [];
    const checkedAt = new Date().toISOString();

    console.log(`[check-data-integrity] Starting integrity check at ${checkedAt}`);

    // Check 1: Multiple Active Contracts per Employee
    const { data: activeContracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, employee_id, status, end_date, employees(full_name)')
      .eq('status', 'Active');

    if (contractsError) {
      console.error('Error fetching active contracts:', contractsError);
    } else if (activeContracts) {
      const groupedByEmployee: Record<string, typeof activeContracts> = {};
      for (const contract of activeContracts) {
        const empId = contract.employee_id;
        if (!groupedByEmployee[empId]) {
          groupedByEmployee[empId] = [];
        }
        groupedByEmployee[empId].push(contract);
      }

      for (const [empId, contracts] of Object.entries(groupedByEmployee)) {
        if (contracts.length > 1) {
          discrepancies.push({
            type: 'MULTIPLE_ACTIVE_CONTRACTS',
            severity: 'critical',
            employee_id: empId,
            employee_name: (contracts[0].employees as any)?.full_name || 'Unknown',
            details: `Employee has ${contracts.length} active contracts. Contract IDs: ${contracts.map(c => c.id.slice(0, 8)).join(', ')}`,
            found_at: checkedAt,
          });
        }
      }
    }

    console.log(`[check-data-integrity] Multiple active contracts check complete`);

    // Check 2: Active Employees Without Active Contract
    const { data: activeEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, status')
      .eq('status', 'Active');

    if (empError) {
      console.error('Error fetching active employees:', empError);
    } else if (activeEmployees && activeContracts) {
      const employeesWithActiveContract = new Set(activeContracts.map(c => c.employee_id));
      
      for (const emp of activeEmployees as EmployeeRow[]) {
        if (!employeesWithActiveContract.has(emp.id)) {
          discrepancies.push({
            type: 'MISSING_ACTIVE_CONTRACT',
            severity: 'warning',
            employee_id: emp.id,
            employee_name: emp.full_name,
            details: `Active employee has no active contract in the system`,
            found_at: checkedAt,
          });
        }
      }
    }

    console.log(`[check-data-integrity] Missing contract check complete`);

    // Check 3: Expired Documents Not Marked as Renewed
    const today = new Date().toISOString().split('T')[0];
    const { data: expiredDocs, error: docsError } = await supabase
      .from('employee_documents')
      .select('id, name, expiry_date, is_renewed, employee_id, employees(full_name)')
      .lt('expiry_date', today)
      .eq('is_renewed', false);

    if (docsError) {
      console.error('Error fetching expired documents:', docsError);
    } else if (expiredDocs) {
      for (const doc of expiredDocs) {
        const employees = doc.employees as { full_name: string } | { full_name: string }[] | null;
        const empName = Array.isArray(employees) ? employees[0]?.full_name : employees?.full_name;
        discrepancies.push({
          type: 'EXPIRED_DOCUMENT_NOT_RENEWED',
          severity: 'info',
          employee_id: doc.employee_id,
          employee_name: empName || 'Unknown',
          details: `Document "${doc.name}" expired on ${doc.expiry_date} but is not marked as renewed`,
          found_at: checkedAt,
        });
      }
    }

    console.log(`[check-data-integrity] Expired documents check complete`);

    // Check 4: Contracts Past End Date But Still Active
    const { data: expiredActiveContracts, error: expContractError } = await supabase
      .from('contracts')
      .select('id, employee_id, end_date, status, employees(full_name)')
      .eq('status', 'Active')
      .not('end_date', 'is', null)
      .lt('end_date', today);

    if (expContractError) {
      console.error('Error fetching expired active contracts:', expContractError);
    } else if (expiredActiveContracts) {
      for (const contract of expiredActiveContracts) {
        discrepancies.push({
          type: 'CONTRACT_EXPIRED_BUT_ACTIVE',
          severity: 'critical',
          employee_id: contract.employee_id,
          employee_name: (contract.employees as any)?.full_name || 'Unknown',
          details: `Contract end date (${contract.end_date}) has passed but status is still Active`,
          found_at: checkedAt,
        });
      }
    }

    console.log(`[check-data-integrity] Expired active contracts check complete`);

    // Check 5: Contract Type Mismatch
    const { data: allActiveContracts, error: allContractsError } = await supabase
      .from('contracts')
      .select('id, employee_id, contract_type, employees(full_name, contract_type)')
      .eq('status', 'Active');

    if (allContractsError) {
      console.error('Error fetching contracts for type check:', allContractsError);
    } else if (allActiveContracts) {
      for (const contract of allActiveContracts as unknown as ContractRow[]) {
        const empContractType = contract.employees?.contract_type;
        if (empContractType && empContractType !== contract.contract_type) {
          discrepancies.push({
            type: 'CONTRACT_TYPE_MISMATCH',
            severity: 'warning',
            employee_id: contract.employee_id,
            employee_name: contract.employees?.full_name || 'Unknown',
            details: `Employee contract_type (${empContractType}) doesn't match active contract type (${contract.contract_type})`,
            found_at: checkedAt,
          });
        }
      }
    }

    console.log(`[check-data-integrity] Contract type mismatch check complete`);

    // Summary
    const summary = {
      success: true,
      checked_at: checkedAt,
      total_discrepancies: discrepancies.length,
      critical: discrepancies.filter(d => d.severity === 'critical').length,
      warnings: discrepancies.filter(d => d.severity === 'warning').length,
      info: discrepancies.filter(d => d.severity === 'info').length,
      discrepancies,
    };

    console.log(`[check-data-integrity] Check complete. Found ${discrepancies.length} discrepancies`);
    console.log(`[check-data-integrity] Critical: ${summary.critical}, Warnings: ${summary.warnings}, Info: ${summary.info}`);

    // Log detailed discrepancies
    if (discrepancies.length > 0) {
      console.log('[check-data-integrity] Discrepancy details:');
      for (const d of discrepancies) {
        console.log(`  [${d.severity.toUpperCase()}] ${d.type}: ${d.employee_name} - ${d.details}`);
      }
    }

    return new Response(
      JSON.stringify(summary),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[check-data-integrity] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errMsg 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
