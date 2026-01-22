import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Employee {
  id: string;
  full_name: string;
  joining_date: string;
  department: string;
}

interface UpcomingEligibility {
  employee: Employee;
  eligibilityDate: Date;
  daysUntil: number;
  cycleNumber: number;
}

function getTicketEligibilityDate(joiningDate: Date, cycleNumber: number): Date {
  const eligibilityDate = new Date(joiningDate);
  eligibilityDate.setFullYear(eligibilityDate.getFullYear() + (cycleNumber * 2));
  return eligibilityDate;
}

function getNextTicketCycle(joiningDate: Date, existingCycles: number[]): { cycleNumber: number; date: Date } | null {
  const today = new Date();
  
  for (let cycle = 1; cycle <= 25; cycle++) {
    if (existingCycles.includes(cycle)) continue;
    
    const eligibilityDate = getTicketEligibilityDate(joiningDate, cycle);
    if (eligibilityDate > today) {
      return { cycleNumber: cycle, date: eligibilityDate };
    }
  }
  return null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const hrEmail = Deno.env.get("HR_NOTIFICATION_EMAIL");
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    
    if (!hrEmail) {
      throw new Error("HR_NOTIFICATION_EMAIL not configured");
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional parameters
    let daysThreshold = 30;
    try {
      const body = await req.json();
      if (body.daysThreshold) {
        daysThreshold = parseInt(body.daysThreshold) || 30;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log(`Checking for ticket eligibilities within ${daysThreshold} days...`);

    // Fetch active employees with joining dates
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, full_name, joining_date, department")
      .not("status", "in", '("Resigned","Terminated")')
      .not("joining_date", "is", null);

    if (empError) {
      throw new Error(`Failed to fetch employees: ${empError.message}`);
    }

    if (!employees || employees.length === 0) {
      console.log("No active employees found");
      return new Response(
        JSON.stringify({ success: true, message: "No active employees found", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing ticket allowance records
    const { data: existingRecords, error: recordsError } = await supabase
      .from("ticket_allowance_records")
      .select("employee_id, eligibility_year");

    if (recordsError) {
      console.error("Error fetching existing records:", recordsError);
    }

    // Group existing records by employee
    const employeeRecords: Record<string, number[]> = {};
    (existingRecords || []).forEach((record) => {
      if (!employeeRecords[record.employee_id]) {
        employeeRecords[record.employee_id] = [];
      }
      // Determine cycle number from eligibility year
      const emp = employees.find(e => e.id === record.employee_id);
      if (emp) {
        const joiningYear = new Date(emp.joining_date).getFullYear();
        const cycleNumber = Math.floor((record.eligibility_year - joiningYear) / 2);
        if (cycleNumber > 0) {
          employeeRecords[record.employee_id].push(cycleNumber);
        }
      }
    });

    const today = new Date();
    const upcomingEligibilities: UpcomingEligibility[] = [];

    for (const emp of employees) {
      const joiningDate = new Date(emp.joining_date);
      const existingCycles = employeeRecords[emp.id] || [];
      
      const nextCycle = getNextTicketCycle(joiningDate, existingCycles);
      if (!nextCycle) continue;

      const daysUntil = Math.ceil((nextCycle.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil > 0 && daysUntil <= daysThreshold) {
        upcomingEligibilities.push({
          employee: emp,
          eligibilityDate: nextCycle.date,
          daysUntil,
          cycleNumber: nextCycle.cycleNumber,
        });
      }
    }

    if (upcomingEligibilities.length === 0) {
      console.log("No upcoming ticket eligibilities within threshold");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `No ticket eligibilities within ${daysThreshold} days`, 
          count: 0 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sort by days until eligibility
    upcomingEligibilities.sort((a, b) => a.daysUntil - b.daysUntil);

    console.log(`Found ${upcomingEligibilities.length} employees with upcoming eligibility`);

    // Build email HTML
    const getOrdinalSuffix = (n: number): string => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const tableRows = upcomingEligibilities.map((item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.employee.full_name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.employee.department}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.eligibilityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="background-color: ${item.daysUntil <= 7 ? '#fef2f2' : item.daysUntil <= 14 ? '#fffbeb' : '#f0fdf4'}; 
                       color: ${item.daysUntil <= 7 ? '#dc2626' : item.daysUntil <= 14 ? '#d97706' : '#16a34a'}; 
                       padding: 4px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500;">
            ${item.daysUntil} days
          </span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${getOrdinalSuffix(item.cycleNumber)}</td>
      </tr>
    `).join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                ✈️ Ticket Allowance Eligibility Alert
              </h1>
              <p style="color: #dbeafe; margin: 8px 0 0 0; font-size: 14px;">
                ${upcomingEligibilities.length} employee${upcomingEligibilities.length > 1 ? 's' : ''} approaching eligibility in the next ${daysThreshold} days
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 24px;">
              <p style="color: #374151; margin: 0 0 20px 0; font-size: 14px;">
                The following employees have upcoming ticket allowance eligibility dates. Please review and process their allowances accordingly.
              </p>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600;">Employee</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600;">Department</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600;">Eligibility Date</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600;">Days Left</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600;">Cycle</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
              
              <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; color: #1e40af; font-size: 13px;">
                  <strong>Reminder:</strong> Ticket allowances should be approved before the eligibility date to ensure timely processing in payroll.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                This is an automated notification from MABDC HRMS
              </p>
              <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 12px;">
                Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "MABDC HRMS <onboarding@resend.dev>",
      to: [hrEmail.toLowerCase().trim()],
      subject: `✈️ Ticket Allowance Alert - ${upcomingEligibilities.length} Employee${upcomingEligibilities.length > 1 ? 's' : ''} Due in ${daysThreshold} Days`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log to email_history
    await supabase.from("email_history").insert({
      recipient_email: hrEmail.toLowerCase().trim(),
      email_type: "ticket_allowance_reminder",
      subject: `Ticket Allowance Alert - ${upcomingEligibilities.length} Employees`,
      status: "sent",
      resend_id: emailResponse.data?.id || null,
      metadata: {
        employees_count: upcomingEligibilities.length,
        days_threshold: daysThreshold,
        employees: upcomingEligibilities.map(e => ({
          id: e.employee.id,
          name: e.employee.full_name,
          eligibility_date: e.eligibilityDate.toISOString(),
          days_until: e.daysUntil,
          cycle: e.cycleNumber,
        })),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent to ${hrEmail}`,
        count: upcomingEligibilities.length,
        employees: upcomingEligibilities.map(e => ({
          name: e.employee.full_name,
          eligibilityDate: e.eligibilityDate.toISOString(),
          daysUntil: e.daysUntil,
          cycle: e.cycleNumber,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-ticket-allowance-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
