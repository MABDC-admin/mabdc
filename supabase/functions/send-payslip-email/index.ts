import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayslipEmailRequest {
  employeeName: string;
  employeeEmail: string;
  employeeId?: string;
  month: string;
  pdfBase64: string;
  companyName?: string;
  hrManagerName?: string;
  hrManagerTitle?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client for logging
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let emailHistoryId: string | null = null;

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const {
      employeeName,
      employeeEmail,
      employeeId,
      month,
      pdfBase64,
      companyName = "M.A Brain Development Center",
      hrManagerName = "HR Department",
      hrManagerTitle = "Human Resource Manager",
    }: PayslipEmailRequest = await req.json();

    console.log(`Sending payslip email to ${employeeEmail} for ${month}`);

    if (!employeeEmail || !pdfBase64) {
      throw new Error("Missing required fields: employeeEmail or pdfBase64");
    }

    const subject = `Payslip for ${month} - ${employeeName}`;

    // Create email history record (pending status)
    const { data: historyData, error: historyError } = await supabase
      .from("email_history")
      .insert({
        employee_id: employeeId || null,
        recipient_email: employeeEmail,
        email_type: "payslip",
        subject: subject,
        status: "pending",
        metadata: { month, employeeName, companyName }
      })
      .select("id")
      .single();

    if (historyData) {
      emailHistoryId = historyData.id;
    }

    const nameParts = employeeName.split(' ');
    const firstName = nameParts[0];
    const filename = `Payslip-${employeeName.replace(/\s+/g, '-')}-${month.replace(/\s+/g, '-')}.pdf`;

    // Convert base64 to Uint8Array
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            line-height: 1.8; 
            color: #333; 
            margin: 0; 
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #1a365d, #2d4a77); 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 40px 30px; }
          .content p { margin: 0 0 20px 0; font-size: 15px; }
          .confidential {
            background: #fff8e1;
            border-left: 4px solid #f59e0b;
            padding: 15px 20px;
            margin: 25px 0;
            font-size: 14px;
            color: #92400e;
          }
          .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .signature p { margin: 0; font-size: 14px; }
          .signature .name { font-weight: 600; color: #1a365d; margin-top: 15px; }
          .signature .title { color: #6b7280; font-size: 13px; }
          .signature .company { color: #1a365d; font-weight: 500; font-size: 13px; }
          .footer { 
            background: #f9fafb; 
            padding: 20px 30px; 
            text-align: center; 
            font-size: 12px; 
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
          }
          .attachment-notice {
            background: #e0f2fe;
            border-radius: 6px;
            padding: 12px 16px;
            margin: 20px 0;
            font-size: 13px;
            color: #0369a1;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${companyName}</h1>
            <p>Payslip for ${month}</p>
          </div>
          <div class="content">
            <p>Dear ${firstName},</p>
            <p>Please find the attached payslip for the month of <strong>${month}</strong>.</p>
            <div class="attachment-notice">
              📎 Attachment: ${filename}
            </div>
            <div class="confidential">
              <strong>⚠️ Confidentiality Notice:</strong><br>
              Please note that the details of your salary are strictly confidential and must not be shared with anyone within the company.
            </div>
            <div class="signature">
              <p>Thank you,</p>
              <p class="name">${hrManagerName}</p>
              <p class="title">${hrManagerTitle}</p>
              <p class="company">${companyName}</p>
            </div>
          </div>
          <div class="footer">
            <p>This is a system-generated email. Please do not reply directly to this message.</p>
            <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Get the from email - use SMTP_FROM_EMAIL if set, otherwise use Resend's test domain
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "onboarding@resend.dev";

    const emailResponse = await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: [employeeEmail],
      subject: subject,
      html: emailHtml,
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    // Extract the email ID from the response
    const resendEmailId = (emailResponse as any)?.data?.id || (emailResponse as any)?.id || null;

    // Update email history with success
    if (emailHistoryId) {
      await supabase
        .from("email_history")
        .update({
          status: "sent",
          resend_id: resendEmailId,
          delivered_at: new Date().toISOString()
        })
        .eq("id", emailHistoryId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Payslip sent to ${employeeEmail}`,
        emailId: resendEmailId
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending payslip email:", error);

    // Update email history with failure
    if (emailHistoryId) {
      await supabase
        .from("email_history")
        .update({
          status: "failed",
          error_message: error.message
        })
        .eq("id", emailHistoryId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
