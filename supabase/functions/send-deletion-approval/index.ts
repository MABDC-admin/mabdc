import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const APPROVAL_EMAIL = "sottodennis@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeletionRequest {
  recordType: string;
  recordId: string;
  recordData: Record<string, unknown>;
  reason?: string;
}

const getRecordDisplayInfo = (recordType: string, recordData: Record<string, unknown>): string => {
  switch (recordType) {
    case 'employee':
      return `Employee: ${recordData.full_name || 'Unknown'} (HRMS: ${recordData.hrms_no || 'N/A'})`;
    case 'payroll':
      return `Payroll: ${recordData.month || 'Unknown month'} - Employee ID: ${recordData.employee_id}`;
    case 'attendance':
      return `Attendance: Date ${recordData.date || 'Unknown'} - Employee ID: ${recordData.employee_id}`;
    case 'leave':
      return `Leave Request: ${recordData.leave_type || 'Unknown type'} (${recordData.start_date} to ${recordData.end_date})`;
    case 'contract':
      return `Contract: ${recordData.mohre_contract_no || 'Unknown'} - Employee ID: ${recordData.employee_id}`;
    case 'document':
      return `Document: ${recordData.name || 'Unknown'} - Employee ID: ${recordData.employee_id}`;
    case 'ticket_allowance':
      return `Ticket Allowance: Year ${recordData.eligibility_year || 'Unknown'} - Employee ID: ${recordData.employee_id}`;
    case 'discipline':
      return `Discipline Record: ${recordData.incident_type || 'Unknown'} - Employee ID: ${recordData.employee_id}`;
    case 'performance':
      return `Performance Review: ${recordData.review_period || 'Unknown'} - Employee ID: ${recordData.employee_id}`;
    default:
      return `${recordType}: ID ${recordData.id || 'Unknown'}`;
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-deletion-approval function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let requestedByEmail = "Unknown User";
    let requestedByUserId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        requestedByEmail = user.email || "Unknown User";
        requestedByUserId = user.id;
      }
    }

    const { recordType, recordId, recordData, reason }: DeletionRequest = await req.json();
    console.log(`Deletion request for ${recordType} with ID ${recordId}`);

    // Create pending deletion record
    const { data: pendingDeletion, error: insertError } = await supabase
      .from("pending_deletions")
      .insert({
        record_type: recordType,
        record_id: recordId,
        record_data: recordData,
        requested_by: requestedByUserId,
        requested_by_email: requestedByEmail,
        reason: reason || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating pending deletion:", insertError);
      throw new Error(`Failed to create pending deletion: ${insertError.message}`);
    }

    console.log("Pending deletion created with token:", pendingDeletion.approval_token);

    // Build approval/reject URLs
    const baseUrl = `${supabaseUrl}/functions/v1/process-deletion-approval`;
    const approveUrl = `${baseUrl}?token=${pendingDeletion.approval_token}&action=approve`;
    const rejectUrl = `${baseUrl}?token=${pendingDeletion.approval_token}&action=reject`;

    const recordDisplay = getRecordDisplayInfo(recordType, recordData);

    // Send approval email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deletion Approval Required</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🗑️ Deletion Approval Required</h1>
          </div>
          
          <div style="padding: 30px;">
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <p style="margin: 0; color: #991b1b; font-weight: 600;">Action Required: Someone is requesting to permanently delete a record.</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: 600; width: 40%;">Record Type:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-transform: capitalize;">${recordType}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: 600;">Record:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${recordDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: 600;">Requested By:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${requestedByEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: 600;">Requested At:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' })}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 600; vertical-align: top;">Reason:</td>
                <td style="padding: 10px 0;">${reason || '<em style="color: #666;">No reason provided</em>'}</td>
              </tr>
            </table>
            
            <details style="margin-bottom: 25px; background: #f9fafb; padding: 15px; border-radius: 8px;">
              <summary style="cursor: pointer; font-weight: 600; color: #374151;">View Full Record Data</summary>
              <pre style="background: #1f2937; color: #e5e7eb; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 12px; margin-top: 10px;">${JSON.stringify(recordData, null, 2)}</pre>
            </details>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${approveUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 10px 10px 0;">✓ APPROVE DELETION</a>
              <a href="${rejectUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 0 10px 10px;">✗ REJECT</a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; text-align: center; margin-top: 25px;">
              This link will expire after the request is processed. If you did not expect this email, please ignore it.
            </p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">MABDC HR Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "MABDC HR System <onboarding@resend.dev>",
      to: [APPROVAL_EMAIL],
      subject: `🗑️ Deletion Approval Required: ${recordType.charAt(0).toUpperCase() + recordType.slice(1)} Record`,
      html: emailHtml,
    });

    console.log("Approval email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Deletion request submitted for approval",
        pendingId: pendingDeletion.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-deletion-approval:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
