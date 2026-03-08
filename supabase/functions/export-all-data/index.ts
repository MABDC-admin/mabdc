import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALL_TABLES = [
  "employees",
  "attendance",
  "attendance_appeals",
  "leave_records",
  "leave_types",
  "leave_balances",
  "leave_accrual_log",
  "contracts",
  "payroll",
  "payroll_earnings",
  "payroll_deductions",
  "employee_documents",
  "employee_education",
  "employee_shifts",
  "employee_shift_overrides",
  "employee_performance",
  "employee_discipline",
  "employee_corrective_actions",
  "employee_face_data",
  "employee_badges",
  "eos_records",
  "events",
  "company_settings",
  "company_folders",
  "company_files",
  "document_types",
  "hr_letters",
  "announcements",
  "notifications",
  "notification_preferences",
  "email_history",
  "email_approval_tokens",
  "org_chart_positions",
  "gamification_config",
  "gamification_points",
  "gamification_transactions",
  "gamification_badges",
  "visa_applications",
  "visa_stage_history",
  "ticket_allowance_records",
  "public_holidays",
  "audit_logs",
  "user_roles",
  "profiles",
  "pending_deletions",
  "user_passkeys",
];

async function fetchAllRows(supabase: any, table: string) {
  const allRows: any[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows.push(...data);
      offset += pageSize;
      if (data.length < pageSize) hasMore = false;
    }
  }
  return allRows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Fetch auth users
    const allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    let hasMoreUsers = true;

    while (hasMoreUsers) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw error;
      if (!users || users.length === 0) {
        hasMoreUsers = false;
      } else {
        allUsers.push(
          ...users.map((u: any) => ({
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || null,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            email_confirmed_at: u.email_confirmed_at,
            phone: u.phone,
            user_metadata: u.user_metadata,
          }))
        );
        if (users.length < perPage) hasMoreUsers = false;
        page++;
      }
    }

    // 2. Fetch all database tables
    const tableData: Record<string, any> = {};
    const tableErrors: Record<string, string> = {};

    for (const table of ALL_TABLES) {
      try {
        const rows = await fetchAllRows(supabase, table);
        tableData[table] = rows;
      } catch (err: any) {
        tableErrors[table] = err.message;
        tableData[table] = [];
      }
    }

    const result = {
      exported_at: new Date().toISOString(),
      auth_users: allUsers,
      auth_users_count: allUsers.length,
      tables: tableData,
      table_counts: Object.fromEntries(
        Object.entries(tableData).map(([k, v]) => [k, (v as any[]).length])
      ),
      errors: Object.keys(tableErrors).length > 0 ? tableErrors : undefined,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
