import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AccrualResult {
  employee_id: string;
  employee_name: string;
  joining_date: string;
  months_of_service: number;
  accrual_rate: number;
  days_accrued: number;
  new_entitled_days: number;
  status: string;
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

    // Parse request body for optional month/year
    let targetMonth: number | null = null;
    let targetYear: number | null = null;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        targetMonth = body.month || null;
        targetYear = body.year || null;
      } catch {
        // Body is optional, use defaults
      }
    }

    // Call the database function to process accrual
    const { data, error } = await supabase.rpc('process_monthly_leave_accrual', {
      target_month: targetMonth,
      target_year: targetYear
    });

    if (error) {
      console.error('Error processing leave accrual:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const results = data as AccrualResult[];
    const processed = results.filter(r => r.status === 'Processed');
    const alreadyProcessed = results.filter(r => r.status === 'Already processed');
    const notStarted = results.filter(r => r.status === 'Not yet started');

    const summary = {
      success: true,
      month: targetMonth || new Date().getMonth() + 1,
      year: targetYear || new Date().getFullYear(),
      total_employees: results.length,
      processed_count: processed.length,
      already_processed_count: alreadyProcessed.length,
      not_started_count: notStarted.length,
      results: results
    };

    console.log('Leave accrual processed:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
