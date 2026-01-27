import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaveRequestPayload {
  leave_id: string;
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

function generateLeaveRequestEmail(
  employeeName: string,
  hrmsNo: string,
  department: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  daysCount: number,
  reason: string | null,
  submittedAt: string,
  attachmentUrl: string | null,
  isEmergency: boolean
): string {
  const dateRange = startDate === endDate 
    ? formatDate(startDate) 
    : `${formatDate(startDate)} to ${formatDate(endDate)}`;

  const emergencyBadge = isEmergency 
    ? '<span style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">🚨 EMERGENCY</span>'
    : '';

  const attachmentSection = attachmentUrl ? `
    <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #0ea5e9;">
      <h3 style="margin: 0 0 12px 0; color: #0369a1; font-size: 16px;">
        📎 Attachment Included
      </h3>
      <a href="${attachmentUrl}" 
         target="_blank" 
         style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        View/Download Attachment
      </a>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">📩 New Leave Request</h1>
    </div>
    
    <div style="padding: 24px;">
      
      <div style="background-color: #faf5ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #7c3aed; font-size: 16px; border-bottom: 2px solid #e9d5ff; padding-bottom: 8px;">
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
          📋 Leave Details
        </h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 120px;">Leave Type:</td>
            <td style="padding: 8px 0; color: #111827;">
              <span style="background: #7c3aed; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                ${leaveType}
              </span>
              ${emergencyBadge}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Duration:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600;">
              ${dateRange} (${daysCount} day${daysCount > 1 ? 's' : ''})
            </td>
          </tr>
          ${reason ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Reason:</td>
            <td style="padding: 8px 0; color: #111827;">${reason}</td>
          </tr>
          ` : ''}
        </table>
        
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #d1d5db;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
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
      </div>
      
      ${attachmentSection}
      
      <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">
          ⏳ This request is pending your review
        </p>
        <p style="margin: 8px 0 0 0; color: #78350f; font-size: 14px;">
          Please log in to the HRMS Admin Dashboard to approve or reject this request.
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
  console.log("send-leave-request-notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: LeaveRequestPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload));

    const { leave_id } = payload;

    if (!leave_id) {
      throw new Error("Missing required field: leave_id");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch leave record with employee details
    const { data: leaveRecord, error: leaveError } = await supabase
      .from("leave_records")
      .select(`
        *,
        employees!leave_records_employee_id_fkey (
          full_name,
          hrms_no,
          department
        )
      `)
      .eq("id", leave_id)
      .single();

    if (leaveError || !leaveRecord) {
      console.error("Failed to fetch leave record:", leaveError);
      throw new Error(`Leave record not found: ${leaveError?.message}`);
    }

    console.log("Leave record fetched:", JSON.stringify(leaveRecord));

    // Get HR email
    const hrEmail = Deno.env.get("HR_NOTIFICATION_EMAIL");
    if (!hrEmail) {
      console.warn("HR_NOTIFICATION_EMAIL not configured, skipping notification");
      return new Response(
        JSON.stringify({ success: false, message: "HR email not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const employee = leaveRecord.employees;
    
    // Generate email HTML
    const emailHtml = generateLeaveRequestEmail(
      employee?.full_name || 'Unknown Employee',
      employee?.hrms_no || 'N/A',
      employee?.department || 'N/A',
      leaveRecord.leave_type,
      leaveRecord.start_date,
      leaveRecord.end_date,
      leaveRecord.days_count,
      leaveRecord.reason,
      leaveRecord.created_at,
      leaveRecord.attachment_url,
      leaveRecord.is_emergency || false
    );

    const subject = `📩 New Leave Request: ${employee?.full_name || 'Employee'} - ${leaveRecord.leave_type}`;

    // Get the from email
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "onboarding@resend.dev";

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
      employee_id: leaveRecord.employee_id,
      recipient_email: hrEmail,
      email_type: "leave_request",
      subject: subject,
      status: "sent",
      resend_id: emailResponse.data?.id || null,
      metadata: {
        leave_id: leave_id,
        leave_type: leaveRecord.leave_type,
        has_attachment: !!leaveRecord.attachment_url,
        submitted_at: leaveRecord.created_at
      }
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-leave-request-notification:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
