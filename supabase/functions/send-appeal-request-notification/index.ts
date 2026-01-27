import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppealRequestPayload {
  appeal_id: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    timeZone: 'Asia/Dubai',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return 'Not specified';
  // Handle time format like "08:30:00"
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { 
    timeZone: 'Asia/Dubai',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function generateAppealRequestEmail(
  employeeName: string,
  hrmsNo: string,
  department: string,
  appealDate: string,
  requestedCheckIn: string | null,
  requestedCheckOut: string | null,
  appealMessage: string,
  submittedAt: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">📩 New Attendance Appeal</h1>
    </div>
    
    <div style="padding: 24px;">
      
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #0284c7; font-size: 16px; border-bottom: 2px solid #bae6fd; padding-bottom: 8px;">
          👤 Employee Information
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; width: 120px;">Name:</td>
            <td style="padding: 6px 0; color: #111827; font-weight: 600;">${employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">HRMS No:</td>
            <td style="padding: 6px 0; color: #111827; font-weight: 600;">${hrmsNo}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;">Department:</td>
            <td style="padding: 6px 0; color: #111827; font-weight: 600;">${department}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          📋 Appeal Details
        </h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 150px;">Appeal Date:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600;">
              ${formatDate(appealDate)}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Requested Check-In:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600;">
              <span style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                ${formatTime(requestedCheckIn)}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Requested Check-Out:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600;">
              <span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                ${formatTime(requestedCheckOut)}
              </span>
            </td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #fefce8; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #eab308;">
        <h3 style="margin: 0 0 12px 0; color: #854d0e; font-size: 16px;">
          💬 Appeal Message
        </h3>
        <p style="margin: 0; color: #422006; line-height: 1.6;">
          ${appealMessage}
        </p>
      </div>
      
      <div style="margin-top: 16px; padding: 12px; background: #f1f5f9; border-radius: 6px; font-size: 14px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">
              ⏱️ Submitted:
            </td>
            <td style="padding: 4px 0; color: #374151;">
              ${formatDateTime(submittedAt)}
            </td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 24px; text-align: center;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">
          ⏳ This appeal is pending your review
        </p>
        <p style="margin: 8px 0 0 0; color: #78350f; font-size: 14px;">
          Please log in to the HRMS Admin Dashboard to approve or reject this appeal.
        </p>
      </div>
      
    </div>
    
    <div style="background-color: #f3f4f6; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        This is an automated notification from MABDC HR System
      </p>
    </div>
    
  </div>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-appeal-request-notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: AppealRequestPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload));

    const { appeal_id } = payload;

    if (!appeal_id) {
      throw new Error("Missing required field: appeal_id");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch appeal record with employee details
    const { data: appealRecord, error: appealError } = await supabase
      .from("attendance_appeals")
      .select(`
        *,
        employees!attendance_appeals_employee_id_fkey (
          full_name,
          hrms_no,
          department
        )
      `)
      .eq("id", appeal_id)
      .single();

    if (appealError || !appealRecord) {
      console.error("Failed to fetch appeal record:", appealError);
      throw new Error(`Appeal record not found: ${appealError?.message}`);
    }

    console.log("Appeal record fetched:", JSON.stringify(appealRecord));

    // Get HR email
    const hrEmail = Deno.env.get("HR_NOTIFICATION_EMAIL");
    if (!hrEmail) {
      console.warn("HR_NOTIFICATION_EMAIL not configured, skipping notification");
      return new Response(
        JSON.stringify({ success: false, message: "HR email not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const employee = appealRecord.employees;
    
    // Generate email HTML
    const emailHtml = generateAppealRequestEmail(
      employee?.full_name || 'Unknown Employee',
      employee?.hrms_no || 'N/A',
      employee?.department || 'N/A',
      appealRecord.appeal_date,
      appealRecord.requested_check_in,
      appealRecord.requested_check_out,
      appealRecord.appeal_message,
      appealRecord.created_at
    );

    const subject = `📩 New Attendance Appeal: ${employee?.full_name || 'Employee'} - ${formatDate(appealRecord.appeal_date)}`;

    // Get the from email
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "onboarding@resend.dev";

    console.log("Sending email to:", hrEmail);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `MABDC HRMS <${fromEmail}>`,
      to: [hrEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", JSON.stringify(emailResponse));

    // Log to email_history
    await supabase.from("email_history").insert({
      employee_id: appealRecord.employee_id,
      recipient_email: hrEmail,
      email_type: "appeal_request",
      subject: subject,
      status: "sent",
      resend_id: emailResponse.data?.id || null,
      metadata: {
        appeal_id: appeal_id,
        appeal_date: appealRecord.appeal_date,
        submitted_at: appealRecord.created_at
      }
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-appeal-request-notification:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
