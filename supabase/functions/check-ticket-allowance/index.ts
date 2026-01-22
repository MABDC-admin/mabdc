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

function isEligibleForTicketAllowance(joiningDate: Date): boolean {
  const today = new Date();
  const twoYearsAgo = new Date(today);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  return joiningDate <= twoYearsAgo;
}

function getEligibilityYear(joiningDate: Date): number {
  const twoYearsFromJoining = new Date(joiningDate);
  twoYearsFromJoining.setFullYear(twoYearsFromJoining.getFullYear() + 2);
  return twoYearsFromJoining.getFullYear();
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

    const currentYear = new Date().getFullYear();
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
      
      if (!isEligibleForTicketAllowance(joiningDate)) {
        results.skipped++;
        continue;
      }

      const eligibilityYear = getEligibilityYear(joiningDate);
      
      // Only create records for current year or past years that haven't been processed
      if (eligibilityYear > currentYear) {
        results.skipped++;
        continue;
      }

      // Check if record already exists for this employee and year
      const { data: existing, error: existError } = await supabase
        .from('ticket_allowance_records')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('eligibility_year', currentYear)
        .single();

      if (existError && existError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected
        results.errors.push(`Error checking existing record for ${employee.full_name}: ${existError.message}`);
        continue;
      }

      if (existing) {
        results.skipped++;
        continue;
      }

      // Create new ticket allowance record
      const { error: insertError } = await supabase
        .from('ticket_allowance_records')
        .insert({
          employee_id: employee.id,
          eligibility_year: currentYear,
          eligibility_start_date: `${currentYear}-01-01`,
          status: 'pending',
          reminder_active: true,
        });

      if (insertError) {
        results.errors.push(`Failed to create record for ${employee.full_name}: ${insertError.message}`);
        continue;
      }

      // Create audit log
      await supabase.from('ticket_allowance_audit_log').insert({
        ticket_allowance_id: (await supabase
          .from('ticket_allowance_records')
          .select('id')
          .eq('employee_id', employee.id)
          .eq('eligibility_year', currentYear)
          .single()).data?.id,
        action: 'created',
        details: {
          source: 'check-ticket-allowance-function',
          joining_date: employee.joining_date,
          eligibility_year: currentYear,
        },
      });

      results.created++;
      console.log(`Created ticket allowance record for ${employee.full_name} (${currentYear})`);
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
