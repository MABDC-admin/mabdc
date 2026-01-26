import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetAccountRequest {
  employeeId: string;
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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify caller is authenticated
    const { data: { user: callingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerId = callingUser.id;

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
        JSON.stringify({ error: 'Only HR and Admin can reset employee accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { employeeId }: ResetAccountRequest = await req.json();

    if (!employeeId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: employeeId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch employee to get user_id
    const { data: employee, error: empError } = await adminClient
      .from('employees')
      .select('id, full_name, user_id')
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

    const userId = employee.user_id;
    console.log(`Resetting account for employee ${employee.full_name} (${employeeId}), user_id: ${userId}`);

    // Step 1: Delete user roles
    const { error: rolesDeleteError } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (rolesDeleteError) {
      console.error('Error deleting user roles:', rolesDeleteError);
      // Continue anyway
    }

    // Step 2: Unlink employee from user_id
    const { error: unlinkError } = await adminClient
      .from('employees')
      .update({ user_id: null })
      .eq('id', employeeId);

    if (unlinkError) {
      console.error('Error unlinking employee:', unlinkError);
      return new Response(
        JSON.stringify({ error: 'Failed to unlink employee from account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Delete the auth user
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      // The employee is already unlinked, so we can proceed
      // The auth user might need manual cleanup
    }

    console.log(`Successfully reset account for ${employee.full_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account reset successfully. You can now generate a new account for this employee.',
        employeeId,
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
