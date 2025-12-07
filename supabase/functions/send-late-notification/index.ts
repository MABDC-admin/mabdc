import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LateNotificationRequest {
  employeeName: string;
  employeeId: string;
  hrmsNo: string;
  department: string;
  jobPosition: string;
  checkInTime: string;
  scheduledTime: string;
  minutesLate: number;
  photoUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: LateNotificationRequest = await req.json();
    console.log("Sending late notification for:", data.employeeName);

    const client = new SmtpClient();

    await client.connectTLS({
      hostname: Deno.env.get("SMTP_HOST") || "",
      port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
      username: Deno.env.get("SMTP_USER") || "",
      password: Deno.env.get("SMTP_PASS") || "",
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { background: #374151; color: white; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; }
          .info-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: bold; color: #6b7280; display: inline-block; width: 140px; }
          .value { color: #111827; }
          .late-badge { background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 20px; font-weight: bold; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Late Check-In Alert</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Employee arrived late to work</p>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">Employee Name:</span>
              <span class="value">${data.employeeName}</span>
            </div>
            <div class="info-row">
              <span class="label">HRMS No:</span>
              <span class="value">${data.hrmsNo}</span>
            </div>
            <div class="info-row">
              <span class="label">Department:</span>
              <span class="value">${data.department}</span>
            </div>
            <div class="info-row">
              <span class="label">Position:</span>
              <span class="value">${data.jobPosition}</span>
            </div>
            <div class="info-row">
              <span class="label">Scheduled Time:</span>
              <span class="value">${data.scheduledTime}</span>
            </div>
            <div class="info-row">
              <span class="label">Actual Check-In:</span>
              <span class="value">${data.checkInTime}</span>
            </div>
            <div class="info-row">
              <span class="label">Time Late:</span>
              <span class="value"><span class="late-badge">${data.minutesLate} minutes late</span></span>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0;">This is an automated notification from MABDC HR System</p>
            <p style="margin: 5px 0 0 0;">Generated on ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.send({
      from: Deno.env.get("SMTP_FROM_EMAIL") || "",
      to: Deno.env.get("HR_NOTIFICATION_EMAIL") || "",
      subject: `Late Check-In: ${data.employeeName} - ${data.minutesLate} mins late`,
      content: `Late Check-In Alert\n\nEmployee: ${data.employeeName}\nHRMS No: ${data.hrmsNo}\nDepartment: ${data.department}\nPosition: ${data.jobPosition}\nScheduled: ${data.scheduledTime}\nActual: ${data.checkInTime}\nMinutes Late: ${data.minutesLate}`,
      html: emailHtml,
    });

    await client.close();

    console.log("Late notification email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending late notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
