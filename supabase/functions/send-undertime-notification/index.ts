import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UndertimeNotificationRequest {
  employeeName: string;
  employeeId: string;
  hrmsNo: string;
  department: string;
  jobPosition: string;
  employeeEmail: string;
  checkOutTime: string;
  scheduledEndTime: string;
  minutesEarly: number;
}

const generateHREmailHtml = (data: UndertimeNotificationRequest): string => {
  const date = new Date().toLocaleDateString('en-US', { 
    timeZone: 'Asia/Dubai',
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { background: #374151; color: white; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; }
        .info-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .label { font-weight: bold; color: #6b7280; display: inline-block; width: 140px; }
        .value { color: #111827; }
        .undertime-badge { background: #fef3c7; color: #d97706; padding: 4px 12px; border-radius: 20px; font-weight: bold; display: inline-block; }
        .notice { background: #e0f2fe; border-left: 4px solid #0ea5e9; padding: 12px; margin-top: 16px; border-radius: 0 8px 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">⏰ Early Checkout Alert</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Employee left before shift end time</p>
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
            <span class="value">${data.department || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="label">Position:</span>
            <span class="value">${data.jobPosition || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="label">Date:</span>
            <span class="value">${date}</span>
          </div>
          <div class="info-row">
            <span class="label">Scheduled End:</span>
            <span class="value">${data.scheduledEndTime}</span>
          </div>
          <div class="info-row">
            <span class="label">Actual Checkout:</span>
            <span class="value">${data.checkOutTime}</span>
          </div>
          <div class="info-row">
            <span class="label">Time Early:</span>
            <span class="value"><span class="undertime-badge">${data.minutesEarly} minutes early</span></span>
          </div>
          <div class="notice">
            <strong>ℹ️ Note:</strong> The employee has been automatically notified to submit an exception or appeal explaining the reason for the early departure.
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
};

const generateEmployeeEmailHtml = (data: UndertimeNotificationRequest): string => {
  const date = new Date().toLocaleDateString('en-US', { 
    timeZone: 'Asia/Dubai',
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const firstName = data.employeeName.split(' ')[0];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { background: #374151; color: white; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; }
        .time-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .time-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .time-row:last-child { border-bottom: none; }
        .time-label { color: #6b7280; }
        .time-value { font-weight: bold; color: #111827; }
        .early-badge { background: #fef3c7; color: #d97706; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
        .action-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-top: 16px; border-radius: 0 8px 8px 0; }
        .action-title { font-weight: bold; color: #1d4ed8; margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">⏰ Action Required</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Please Submit Your Undertime Exception</p>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p>Our system detected that you checked out before your scheduled shift end time on <strong>${date}</strong>.</p>
          
          <div class="time-box">
            <div class="time-row">
              <span class="time-label">Scheduled End Time:</span>
              <span class="time-value">${data.scheduledEndTime}</span>
            </div>
            <div class="time-row">
              <span class="time-label">Your Checkout Time:</span>
              <span class="time-value">${data.checkOutTime}</span>
            </div>
            <div class="time-row">
              <span class="time-label">Early By:</span>
              <span class="early-badge">${data.minutesEarly} minutes</span>
            </div>
          </div>
          
          <div class="action-box">
            <div class="action-title">📝 What You Need To Do:</div>
            <p style="margin: 0;">Please submit an attendance appeal or exception with your reason for the early departure.</p>
            <p style="margin: 8px 0 0 0;"><strong>How to submit:</strong> Log in to the Employee Portal → Attendance → Submit Appeal</p>
          </div>
          
          <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">If you have any questions, please contact the HR department.</p>
        </div>
        <div class="footer">
          <p style="margin: 0;">This is an automated notification from MABDC HR System</p>
          <p style="margin: 5px 0 0 0;">Generated on ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' })}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: UndertimeNotificationRequest = await req.json();
    console.log("Sending undertime notification for:", data.employeeName);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);
    const hrEmail = Deno.env.get("HR_NOTIFICATION_EMAIL");
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "onboarding@resend.dev";

    const results: { hr?: boolean; employee?: boolean } = {};

    // 1. Send to HR/Admin
    if (hrEmail) {
      try {
        await resend.emails.send({
          from: `MABDC HRMS <${fromEmail}>`,
          to: [hrEmail],
          subject: `⏰ Early Checkout: ${data.employeeName} - ${data.minutesEarly} mins early`,
          html: generateHREmailHtml(data),
        });
        results.hr = true;
        console.log("HR notification sent successfully");
      } catch (hrError) {
        console.error("Failed to send HR notification:", hrError);
        results.hr = false;
      }
    }

    // 2. Send to Employee (if work email exists)
    if (data.employeeEmail) {
      try {
        await resend.emails.send({
          from: `MABDC HRMS <${fromEmail}>`,
          to: [data.employeeEmail],
          subject: `Action Required: Please Submit Undertime Exception`,
          html: generateEmployeeEmailHtml(data),
        });
        results.employee = true;
        console.log("Employee notification sent successfully to:", data.employeeEmail);
      } catch (empError) {
        console.error("Failed to send employee notification:", empError);
        results.employee = false;
      }
    }

    console.log("Undertime notification complete. Results:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending undertime notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
