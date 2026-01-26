import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shift definitions matching the frontend
const SHIFT_DEFINITIONS = {
  morning: { label: 'Morning Shift', start: '08:00', end: '17:00' },
  afternoon: { label: 'Afternoon Shift', start: '09:00', end: '18:00' },
  flexible: { label: 'Flexible Shift', start: null, end: null },
};

const DEFAULT_SHIFT = { start: '08:00', end: '17:00', label: 'Default (Morning)' };

interface AbsentEmployee {
  id: string;
  full_name: string;
  hrms_no: string;
  department: string;
  job_position: string;
  shift_label: string;
  shift_start: string;
  shift_end: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting absent notification check...");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Get today's date in UAE timezone (UTC+4)
    const now = new Date();
    const uaeOffset = 4 * 60; // UAE is UTC+4
    const uaeTime = new Date(now.getTime() + (uaeOffset + now.getTimezoneOffset()) * 60000);
    const todayStr = uaeTime.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`Checking absences for date: ${todayStr}`);

    // Fetch all active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, hrms_no, department, job_position')
      .eq('status', 'Active');

    if (empError) {
      throw new Error(`Failed to fetch employees: ${empError.message}`);
    }

    if (!employees || employees.length === 0) {
      console.log("No active employees found");
      return new Response(JSON.stringify({ message: "No active employees" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${employees.length} active employees`);

    // Fetch all attendance records for today
    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select('employee_id, check_in')
      .eq('date', todayStr);

    if (attError) {
      throw new Error(`Failed to fetch attendance: ${attError.message}`);
    }

    // Create a map of employees who checked in
    const checkedInEmployees = new Set(
      (attendance || [])
        .filter(a => a.check_in !== null)
        .map(a => a.employee_id)
    );

    console.log(`${checkedInEmployees.size} employees checked in today`);

    // Fetch employee shifts
    const { data: shifts, error: shiftError } = await supabase
      .from('employee_shifts')
      .select('employee_id, shift_type');

    if (shiftError) {
      console.error("Failed to fetch shifts:", shiftError);
    }

    const shiftMap = new Map(
      (shifts || []).map(s => [s.employee_id, s.shift_type])
    );

    // Fetch shift overrides for today
    const { data: overrides, error: overrideError } = await supabase
      .from('employee_shift_overrides')
      .select('employee_id, shift_start_time, shift_end_time')
      .eq('override_date', todayStr);

    if (overrideError) {
      console.error("Failed to fetch overrides:", overrideError);
    }

    const overrideMap = new Map(
      (overrides || []).map(o => [o.employee_id, {
        start: o.shift_start_time.substring(0, 5),
        end: o.shift_end_time.substring(0, 5)
      }])
    );

    // Check for approved leave today
    const { data: leaveRecords, error: leaveError } = await supabase
      .from('leave_records')
      .select('employee_id')
      .eq('status', 'Approved')
      .lte('start_date', todayStr)
      .gte('end_date', todayStr);

    if (leaveError) {
      console.error("Failed to fetch leave records:", leaveError);
    }

    const employeesOnLeave = new Set(
      (leaveRecords || []).map(l => l.employee_id)
    );

    console.log(`${employeesOnLeave.size} employees on approved leave`);

    // Identify absent employees (not checked in and not on leave)
    const absentEmployees: AbsentEmployee[] = [];

    for (const emp of employees) {
      // Skip if checked in
      if (checkedInEmployees.has(emp.id)) continue;
      
      // Skip if on approved leave
      if (employeesOnLeave.has(emp.id)) continue;

      // Determine shift times
      let shiftStart = DEFAULT_SHIFT.start;
      let shiftEnd = DEFAULT_SHIFT.end;
      let shiftLabel = DEFAULT_SHIFT.label;

      // Check for override first
      const override = overrideMap.get(emp.id);
      if (override) {
        shiftStart = override.start;
        shiftEnd = override.end;
        shiftLabel = `Custom (${shiftStart}-${shiftEnd})`;
      } else {
        // Check permanent shift assignment
        const shiftType = shiftMap.get(emp.id) as keyof typeof SHIFT_DEFINITIONS | undefined;
        if (shiftType && SHIFT_DEFINITIONS[shiftType]) {
          const def = SHIFT_DEFINITIONS[shiftType];
          if (def.start && def.end) {
            shiftStart = def.start;
            shiftEnd = def.end;
            shiftLabel = def.label;
          }
        }
      }

      absentEmployees.push({
        id: emp.id,
        full_name: emp.full_name,
        hrms_no: emp.hrms_no,
        department: emp.department,
        job_position: emp.job_position,
        shift_label: shiftLabel,
        shift_start: shiftStart,
        shift_end: shiftEnd
      });
    }

    console.log(`${absentEmployees.length} employees absent today`);

    // Format date for display
    const displayDate = new Date(todayStr).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Generate email HTML
    let emailHtml: string;
    let emailSubject: string;

    if (absentEmployees.length === 0) {
      emailSubject = `✅ All Employees Present - ${displayDate}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .success-icon { font-size: 48px; margin-bottom: 10px; }
            .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1 style="margin: 0;">Perfect Attendance!</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">${displayDate}</p>
            </div>
            <div class="content">
              <p>Great news! All employees have checked in today.</p>
              <p>No absences to report.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from MABDC HRMS</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      emailSubject = `⚠️ Absent Employees Report - ${displayDate} | ${absentEmployees.length} Employee(s) Absent`;
      
      const tableRows = absentEmployees.map((emp, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${emp.full_name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${emp.hrms_no}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${emp.department}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${emp.job_position}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${emp.shift_label}</td>
        </tr>
      `).join('');

      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0 0 0; opacity: 0.9; }
            .stats { display: flex; gap: 20px; margin: 20px 0; }
            .stat-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px 20px; flex: 1; text-align: center; }
            .stat-number { font-size: 32px; font-weight: bold; color: #dc2626; }
            .stat-label { font-size: 14px; color: #6b7280; }
            .table-container { overflow-x: auto; }
            table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th { background: #374151; color: white; padding: 14px 12px; text-align: left; font-weight: 600; }
            th:nth-child(2), th:nth-child(5) { text-align: center; }
            .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
            .warning-icon { font-size: 48px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="warning-icon">⚠️</div>
              <h1>Absent Employees Report</h1>
              <p>${displayDate}</p>
            </div>
            
            <div class="stats">
              <div class="stat-box">
                <div class="stat-number">${absentEmployees.length}</div>
                <div class="stat-label">Employees Absent</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">${employees.length}</div>
                <div class="stat-label">Total Active Employees</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">${employeesOnLeave.size}</div>
                <div class="stat-label">On Approved Leave</div>
              </div>
            </div>
            
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>HRMS No</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Assigned Shift</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>
            
            <div class="footer">
              <p>This is an automated message from MABDC HRMS</p>
              <p>Generated at ${uaeTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UAE Time</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Send email via Resend
    const hrEmail = Deno.env.get("HR_NOTIFICATION_EMAIL") || "myranelsotto@gmail.com";
    
    // Get the from email - use SMTP_FROM_EMAIL if set, otherwise use Resend's test domain
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "onboarding@resend.dev";
    
    console.log(`Sending email to: ${hrEmail}`);

    const emailResponse = await resend.emails.send({
      from: `MABDC HRMS <${fromEmail}>`,
      to: [hrEmail.toLowerCase().trim()],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        date: todayStr,
        totalEmployees: employees.length,
        checkedIn: checkedInEmployees.size,
        onLeave: employeesOnLeave.size,
        absentCount: absentEmployees.length,
        emailSent: true,
        emailId: (emailResponse as { id?: string }).id || null
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in send-absent-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
