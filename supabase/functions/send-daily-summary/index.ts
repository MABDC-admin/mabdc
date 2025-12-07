import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Generating daily attendance summary...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date in UAE timezone
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
    console.log("Fetching attendance for date:", today);

    // Fetch today's attendance with employee details
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        *,
        employees:employee_id (
          full_name,
          hrms_no,
          department,
          job_position,
          photo_url
        )
      `)
      .eq('date', today);

    if (attendanceError) {
      console.error("Error fetching attendance:", attendanceError);
      throw attendanceError;
    }

    // Fetch total active employees
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('id')
      .eq('status', 'Active');

    if (employeesError) {
      console.error("Error fetching employees:", employeesError);
      throw employeesError;
    }

    const totalEmployees = employeesData?.length || 0;
    const presentCount = attendanceData?.filter(a => a.status === 'Present').length || 0;
    const lateCount = attendanceData?.filter(a => a.status === 'Late').length || 0;
    const absentCount = totalEmployees - (presentCount + lateCount);

    // Get late employees details
    const lateEmployees = attendanceData?.filter(a => a.status === 'Late') || [];

    console.log(`Summary: ${presentCount} present, ${lateCount} late, ${absentCount} absent`);

    // Generate email HTML
    const lateEmployeesRows = lateEmployees.map(emp => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${emp.employees?.full_name || 'N/A'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${emp.employees?.hrms_no || 'N/A'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${emp.employees?.department || 'N/A'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${emp.check_in || 'N/A'}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 700px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; }
          .section { padding: 20px; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #374151; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; }
          .footer { background: #374151; color: white; padding: 20px; text-align: center; font-size: 12px; }
          .no-late { padding: 20px; text-align: center; color: #10b981; background: #ecfdf5; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Daily Attendance Summary</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Dubai' })}</p>
          </div>
          
          <table style="width: 100%;">
            <tr>
              <td style="text-align: center; padding: 20px; background: #f9fafb;">
                <div style="font-size: 32px; font-weight: bold;">${totalEmployees}</div>
                <div style="font-size: 14px; color: #6b7280;">Total Employees</div>
              </td>
              <td style="text-align: center; padding: 20px; background: #f9fafb;">
                <div style="font-size: 32px; font-weight: bold; color: #10b981;">${presentCount}</div>
                <div style="font-size: 14px; color: #6b7280;">On Time</div>
              </td>
              <td style="text-align: center; padding: 20px; background: #f9fafb;">
                <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${lateCount}</div>
                <div style="font-size: 14px; color: #6b7280;">Late</div>
              </td>
              <td style="text-align: center; padding: 20px; background: #f9fafb;">
                <div style="font-size: 32px; font-weight: bold; color: #ef4444;">${absentCount}</div>
                <div style="font-size: 14px; color: #6b7280;">Absent</div>
              </td>
            </tr>
          </table>

          <div class="section">
            <div class="section-title">Late Arrivals Today</div>
            ${lateEmployees.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>HRMS No</th>
                    <th>Department</th>
                    <th>Check-In Time</th>
                  </tr>
                </thead>
                <tbody>
                  ${lateEmployeesRows}
                </tbody>
              </table>
            ` : `
              <div class="no-late">No late arrivals today! All employees arrived on time.</div>
            `}
          </div>

          <div class="footer">
            <p style="margin: 0;">MABDC HR System - Daily Attendance Report</p>
            <p style="margin: 5px 0 0 0;">Generated at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using SmtpClient
    const client = new SmtpClient();

    await client.connectTLS({
      hostname: Deno.env.get("SMTP_HOST") || "",
      port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
      username: Deno.env.get("SMTP_USER") || "",
      password: Deno.env.get("SMTP_PASS") || "",
    });

    await client.send({
      from: Deno.env.get("SMTP_FROM_EMAIL") || "",
      to: Deno.env.get("HR_NOTIFICATION_EMAIL") || "",
      subject: `Daily Attendance Summary - ${today} | ${presentCount} Present, ${lateCount} Late, ${absentCount} Absent`,
      content: `Daily Attendance Summary - ${today}\n\nTotal: ${totalEmployees}\nOn Time: ${presentCount}\nLate: ${lateCount}\nAbsent: ${absentCount}`,
      html: emailHtml,
    });

    await client.close();

    console.log("Daily summary email sent successfully");

    return new Response(JSON.stringify({ 
      success: true,
      summary: { totalEmployees, presentCount, lateCount, absentCount }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error generating daily summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
