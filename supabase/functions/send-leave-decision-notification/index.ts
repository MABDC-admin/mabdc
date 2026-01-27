import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaveDecisionPayload {
  leave_id: string;
  status: 'Approved' | 'Rejected';
  rejection_reason?: string;
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

function generateLeaveDecisionEmail(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  daysCount: number,
  reason: string | null,
  status: 'Approved' | 'Rejected',
  rejectionReason: string | null,
  requestedAt: string
): string {
  const isApproved = status === 'Approved';
  const headerColor = isApproved ? '#10b981' : '#ef4444';
  const statusIcon = isApproved ? '✅' : '❌';
  const statusText = isApproved ? 'APPROVED' : 'REJECTED';
  const decisionTime = formatDateTime(new Date().toISOString());
  
  const dateRange = startDate === endDate 
    ? formatDate(startDate) 
    : `${formatDate(startDate)} to ${formatDate(endDate)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <div style="background: ${headerColor}; color: white; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">${statusIcon} Leave Request ${statusText}</h1>
    </div>
    
    <div style="padding: 24px;">
      <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
        Dear <strong>${employeeName}</strong>,
      </p>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
        Your leave request has been <strong style="color: ${headerColor};">${statusText}</strong>.
      </p>
      
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          📋 Leave Details
        </h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 140px;">Leave Type:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600;">
              <span style="background: #7c3aed; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                ${leaveType}
              </span>
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
            <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Your Reason:</td>
            <td style="padding: 8px 0; color: #111827;">${reason}</td>
          </tr>
          ` : ''}
        </table>
        
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #d1d5db;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">
                ⏱️ Requested:
              </td>
              <td style="padding: 4px 0; color: #374151;">
                ${formatDateTime(requestedAt)}
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7280;">
                ${statusIcon} ${status}:
              </td>
              <td style="padding: 4px 0; color: #374151;">
                ${decisionTime}
              </td>
            </tr>
          </table>
        </div>
      </div>
      
      ${!isApproved && rejectionReason ? `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
        <strong style="color: #991b1b;">📝 Rejection Reason:</strong>
        <p style="margin: 8px 0 0 0; color: #7f1d1d;">${rejectionReason}</p>
      </div>
      ` : ''}
      
      <p style="font-size: 16px; color: #374151;">
        ${isApproved 
          ? 'Enjoy your time off!' 
          : 'If you have any questions, please contact HR.'}
      </p>
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
  console.log("send-leave-decision-notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: LeaveDecisionPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload));

    const { leave_id, status, rejection_reason } = payload;

    if (!leave_id || !status) {
      throw new Error("Missing required fields: leave_id and status");
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
          work_email,
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

    const employee = leaveRecord.employees;
    if (!employee?.work_email) {
      console.warn("Employee has no work email, skipping notification");
      return new Response(
        JSON.stringify({ success: false, message: "No employee email found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientEmail = employee.work_email.toLowerCase().trim();
    console.log(`Sending email to: ${recipientEmail}`);

    // Generate email HTML
    const emailHtml = generateLeaveDecisionEmail(
      employee.full_name,
      leaveRecord.leave_type,
      leaveRecord.start_date,
      leaveRecord.end_date,
      leaveRecord.days_count,
      leaveRecord.reason,
      status,
      rejection_reason || null,
      leaveRecord.created_at
    );

    const statusIcon = status === 'Approved' ? '✅' : '❌';
    const subject = `${statusIcon} Leave ${status}: ${leaveRecord.leave_type} - ${leaveRecord.start_date}`;

    // Get the from email - use SMTP_FROM_EMAIL if set, otherwise fallback
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "onboarding@resend.dev";
    
    // Get HR email for CC confirmation
    const hrEmail = Deno.env.get("HR_NOTIFICATION_EMAIL");

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `MABDC HRMS <${fromEmail}>`,
      to: [recipientEmail],
      cc: hrEmail ? [hrEmail] : undefined,
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", JSON.stringify(emailResponse));

    // Log to email_history
    await supabase.from("email_history").insert({
      employee_id: leaveRecord.employee_id,
      recipient_email: recipientEmail,
      email_type: "leave_decision",
      subject: subject,
      status: "sent",
      resend_id: emailResponse.data?.id || null,
      metadata: {
        leave_id: leave_id,
        leave_type: leaveRecord.leave_type,
        decision: status,
        requested_at: leaveRecord.created_at
      }
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-leave-decision-notification:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
