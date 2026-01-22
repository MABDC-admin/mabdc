import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Employee {
  id: string;
  full_name: string;
  joining_date: string;
  status: string;
}

// Calculate the exact eligibility date for a specific cycle (1st, 2nd, 3rd...)
// 1st cycle = joining + 2 years, 2nd cycle = joining + 4 years, etc.
function getTicketEligibilityDate(joiningDate: Date, cycleNumber: number): Date {
  const eligibilityDate = new Date(joiningDate);
  eligibilityDate.setFullYear(eligibilityDate.getFullYear() + (cycleNumber * 2));
  return eligibilityDate;
}

// Get all past ticket cycles for an employee
function getAllPastTicketCycles(joiningDate: Date): Array<{ cycleNumber: number; eligibilityDate: Date; eligibilityYear: number }> {
  const cycles: Array<{ cycleNumber: number; eligibilityDate: Date; eligibilityYear: number }> = [];
  const today = new Date();
  let cycleNumber = 1;
  
  while (true) {
    const eligibilityDate = getTicketEligibilityDate(joiningDate, cycleNumber);
    
    // Only include past cycles (eligibility date has passed)
    if (eligibilityDate > today) {
      break;
    }
    
    cycles.push({
      cycleNumber,
      eligibilityDate,
      eligibilityYear: eligibilityDate.getFullYear(),
    });
    
    cycleNumber++;
    
    // Safety limit
    if (cycleNumber > 25) break;
  }
  
  return cycles;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      checked: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Fetch all active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, joining_date, status')
      .not('status', 'in', '("Resigned","Terminated")');

    if (empError) {
      throw new Error(`Failed to fetch employees: ${empError.message}`);
    }

    console.log(`Checking ${employees?.length || 0} employees for ticket allowance eligibility`);

    for (const employee of (employees || []) as Employee[]) {
      results.checked++;
      
      if (!employee.joining_date) {
        results.skipped++;
        continue;
      }

      const joiningDate = new Date(employee.joining_date);
      
      // Get all past cycles for this employee
      const pastCycles = getAllPastTicketCycles(joiningDate);
      
      if (pastCycles.length === 0) {
        results.skipped++;
        continue;
      }

      // Get existing records for this employee
      const { data: existingRecords, error: existError } = await supabase
        .from('ticket_allowance_records')
        .select('eligibility_year')
        .eq('employee_id', employee.id);

      if (existError) {
        results.errors.push(`Error fetching records for ${employee.full_name}: ${existError.message}`);
        continue;
      }

      const existingYears = new Set((existingRecords || []).map(r => r.eligibility_year));

      // Create records for all past cycles that are missing
      for (const cycle of pastCycles) {
        if (existingYears.has(cycle.eligibilityYear)) {
          results.skipped++;
          continue;
        }

        // Format the eligibility date (YYYY-MM-DD)
        const eligibilityDateStr = cycle.eligibilityDate.toISOString().split('T')[0];

        // Create new ticket allowance record with exact anniversary date
        const { data: insertedRecord, error: insertError } = await supabase
          .from('ticket_allowance_records')
          .insert({
            employee_id: employee.id,
            eligibility_year: cycle.eligibilityYear,
            eligibility_start_date: eligibilityDateStr,
            status: 'pending',
            reminder_active: true,
          })
          .select('id')
          .single();

        if (insertError) {
          results.errors.push(`Failed to create record for ${employee.full_name} (${cycle.eligibilityYear}): ${insertError.message}`);
          continue;
        }

        // Create audit log
        if (insertedRecord) {
          await supabase.from('ticket_allowance_audit_log').insert({
            ticket_allowance_id: insertedRecord.id,
            action: 'created',
            details: {
              source: 'check-ticket-allowance-function',
              joining_date: employee.joining_date,
              cycle_number: cycle.cycleNumber,
              eligibility_date: eligibilityDateStr,
            },
          });
        }

        results.created++;
        console.log(`Created ticket allowance record for ${employee.full_name} - Cycle ${cycle.cycleNumber} (${eligibilityDateStr})`);
      }
    }

    console.log(`Ticket allowance check complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${results.checked} employees. Created ${results.created} records, skipped ${results.skipped}.`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in check-ticket-allowance function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
