import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAccountRequest {
  employeeId: string;
  employeeName: string;
  workEmail: string;
  password: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization - ensure caller is HR or Admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with user's token to verify their role
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the calling user
    const { data: { user: callingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client to check caller's roles
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: callerRoles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id);

    if (rolesError) {
      console.error('Error fetching caller roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roles = callerRoles?.map(r => r.role) || [];
    const isAuthorized = roles.includes('admin') || roles.includes('hr');

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only HR or Admin can create employee accounts.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { employeeId, employeeName, workEmail, password }: CreateAccountRequest = await req.json();

    if (!employeeId || !employeeName || !workEmail || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: employeeId, employeeName, workEmail, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if employee already has an account
    const { data: existingEmployee, error: empError } = await adminClient
      .from('employees')
      .select('user_id')
      .eq('id', employeeId)
      .single();

    if (empError) {
      console.error('Error checking employee:', empError);
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingEmployee.user_id) {
      return new Response(
        JSON.stringify({ error: 'Employee already has an account' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email is already registered
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === workEmail.toLowerCase());
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Email is already registered in the system' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the auth user using admin API (won't affect caller's session)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: workEmail,
      password: password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: employeeName,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = newUser.user.id;

    // Link the employee to the user
    const { error: updateError } = await adminClient
      .from('employees')
      .update({ user_id: userId })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Error linking employee:', updateError);
      // Try to cleanup the created user
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Failed to link employee to user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add employee role
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({ user_id: userId, role: 'employee' });

    if (roleError) {
      console.error('Error adding role:', roleError);
      // Try to cleanup
      await adminClient.from('employees').update({ user_id: null }).eq('id', employeeId);
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Failed to assign employee role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully created account for employee ${employeeName} (${workEmail})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: 'Employee account created successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
