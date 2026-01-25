import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateEmailRequest {
  employeeId: string;
  newEmail: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create anon client for authorization check
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify caller is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerId = claimsData.claims.sub;

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller is HR or Admin
    const { data: callerRoles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId);

    if (rolesError) {
      console.error('Error fetching caller roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roles = callerRoles?.map((r) => r.role) || [];
    if (!roles.includes('admin') && !roles.includes('hr')) {
      return new Response(
        JSON.stringify({ error: 'Only HR and Admin can update employee emails' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { employeeId, newEmail }: UpdateEmailRequest = await req.json();

    if (!employeeId || !newEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: employeeId and newEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch employee to get user_id
    const { data: employee, error: empError } = await adminClient
      .from('employees')
      .select('id, full_name, user_id, work_email')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      console.error('Error fetching employee:', empError);
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!employee.user_id) {
      return new Response(
        JSON.stringify({ error: 'Employee does not have a linked user account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updating email for employee ${employee.full_name} (${employeeId})`);
    console.log(`Old email: ${employee.work_email}, New email: ${newEmail}`);

    // Update the Auth user's email
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
      employee.user_id,
      {
        email: newEmail,
        email_confirm: true, // Auto-confirm to avoid verification email
      }
    );

    if (authUpdateError) {
      console.error('Error updating auth user email:', authUpdateError);
      return new Response(
        JSON.stringify({ error: `Failed to update auth email: ${authUpdateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the profiles table email
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', employee.user_id);

    if (profileError) {
      console.error('Error updating profile email:', profileError);
      // Non-fatal: auth was updated, just log the profile error
    }

    // Update the employee work_email
    const { error: empUpdateError } = await adminClient
      .from('employees')
      .update({ work_email: newEmail })
      .eq('id', employeeId);

    if (empUpdateError) {
      console.error('Error updating employee work_email:', empUpdateError);
    }

    console.log(`Successfully synced email for ${employee.full_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email synced successfully',
        employeeId,
        newEmail,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
