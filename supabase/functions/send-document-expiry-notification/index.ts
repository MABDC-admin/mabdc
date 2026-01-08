import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpiringDocument {
  employeeName: string;
  employeeId: string;
  documentType: string;
  expiryDate: string;
  daysRemaining: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Deno.env.get("SMTP_PORT");
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");
    const SMTP_FROM_EMAIL = Deno.env.get("SMTP_FROM_EMAIL");
    const HR_NOTIFICATION_EMAIL = Deno.env.get("HR_NOTIFICATION_EMAIL");

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !HR_NOTIFICATION_EMAIL) {
      console.log("SMTP not fully configured, skipping email notification");
      return new Response(
        JSON.stringify({ success: false, message: "SMTP not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

    const expiringDocuments: ExpiringDocument[] = [];

    // 1. Check employee fields (visa, passport, emirates ID)
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, full_name, visa_expiration, passport_expiry, emirates_id_expiry")
      .eq("status", "Active");

    if (empError) {
      console.error("Error fetching employees:", empError);
    } else {
      for (const emp of employees || []) {
        // Visa expiry
        if (emp.visa_expiration && emp.visa_expiration <= thirtyDaysStr) {
          const daysRemaining = Math.ceil(
            (new Date(emp.visa_expiration).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          expiringDocuments.push({
            employeeName: emp.full_name,
            employeeId: emp.id,
            documentType: "Visa",
            expiryDate: emp.visa_expiration,
            daysRemaining,
          });
        }

        // Passport expiry
        if (emp.passport_expiry && emp.passport_expiry <= thirtyDaysStr) {
          const daysRemaining = Math.ceil(
            (new Date(emp.passport_expiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          expiringDocuments.push({
            employeeName: emp.full_name,
            employeeId: emp.id,
            documentType: "Passport",
            expiryDate: emp.passport_expiry,
            daysRemaining,
          });
        }

        // Emirates ID expiry
        if (emp.emirates_id_expiry && emp.emirates_id_expiry <= thirtyDaysStr) {
          const daysRemaining = Math.ceil(
            (new Date(emp.emirates_id_expiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          expiringDocuments.push({
            employeeName: emp.full_name,
            employeeId: emp.id,
            documentType: "Emirates ID",
            expiryDate: emp.emirates_id_expiry,
            daysRemaining,
          });
        }
      }
    }

    // 2. Check employee_documents table
    const { data: documents, error: docError } = await supabase
      .from("employee_documents")
      .select(`
        id,
        category,
        expiry_date,
        employee_id,
        employees!inner(full_name, status)
      `)
      .not("expiry_date", "is", null)
      .lte("expiry_date", thirtyDaysStr)
      .eq("is_renewed", false);

    if (docError) {
      console.error("Error fetching documents:", docError);
    } else {
      for (const doc of documents || []) {
        const employee = doc.employees as any;
        if (employee?.status !== "Active") continue;

        const daysRemaining = Math.ceil(
          (new Date(doc.expiry_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        expiringDocuments.push({
          employeeName: employee.full_name,
          employeeId: doc.employee_id,
          documentType: doc.category || "Document",
          expiryDate: doc.expiry_date!,
          daysRemaining,
        });
      }
    }

    // 3. Check contracts table
    const { data: contracts, error: contractError } = await supabase
      .from("contracts")
      .select(`
        id,
        end_date,
        employee_id,
        employees!inner(full_name, status)
      `)
      .eq("status", "Active")
      .not("end_date", "is", null)
      .lte("end_date", thirtyDaysStr);

    if (contractError) {
      console.error("Error fetching contracts:", contractError);
    } else {
      for (const contract of contracts || []) {
        const employee = contract.employees as any;
        if (employee?.status !== "Active") continue;

        const daysRemaining = Math.ceil(
          (new Date(contract.end_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        expiringDocuments.push({
          employeeName: employee.full_name,
          employeeId: contract.employee_id,
          documentType: "Employment Contract",
          expiryDate: contract.end_date!,
          daysRemaining,
        });
      }
    }

    // Sort by days remaining
    expiringDocuments.sort((a, b) => a.daysRemaining - b.daysRemaining);

    if (expiringDocuments.length === 0) {
      console.log("No documents expiring within 30 days");
      return new Response(
        JSON.stringify({ success: true, message: "No expiring documents found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Separate critical (≤7 days) and warning (8-30 days)
    const critical = expiringDocuments.filter((d) => d.daysRemaining <= 7);
    const warning = expiringDocuments.filter((d) => d.daysRemaining > 7);

    // Build HTML email
    const emailHtml = buildEmailHtml(critical, warning);

    // Send email using SMTP
    const emailSubject = `⚠️ Document Expiry Alert: ${critical.length} Critical, ${warning.length} Warning`;

    console.log(`Sending expiry notification email to ${HR_NOTIFICATION_EMAIL}`);
    console.log(`Critical: ${critical.length}, Warning: ${warning.length}`);

    // Use fetch to send via SMTP relay or email service
    // For simplicity, we'll use a basic SMTP approach
    const emailSent = await sendEmail({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || "587"),
      user: SMTP_USER,
      pass: SMTP_PASS,
      from: SMTP_FROM_EMAIL || SMTP_USER,
      to: HR_NOTIFICATION_EMAIL,
      subject: emailSubject,
      html: emailHtml,
    });

    return new Response(
      JSON.stringify({
        success: emailSent,
        message: emailSent ? "Notification email sent" : "Failed to send email",
        documentsCount: expiringDocuments.length,
        critical: critical.length,
        warning: warning.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-document-expiry-notification:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildEmailHtml(critical: ExpiringDocument[], warning: ExpiringDocument[]): string {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const buildTable = (docs: ExpiringDocument[], urgency: "critical" | "warning") => {
    if (docs.length === 0) return "";

    const headerColor = urgency === "critical" ? "#dc2626" : "#f59e0b";
    const headerText = urgency === "critical" ? "🚨 CRITICAL - Expiring within 7 days" : "⚠️ WARNING - Expiring within 30 days";

    return `
      <div style="margin-bottom: 24px;">
        <h2 style="color: ${headerColor}; margin-bottom: 12px; font-size: 18px;">${headerText}</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Employee</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Document Type</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Expiry Date</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Days Left</th>
            </tr>
          </thead>
          <tbody>
            ${docs.map((doc) => `
              <tr style="background-color: ${doc.daysRemaining <= 0 ? '#fee2e2' : doc.daysRemaining <= 7 ? '#fef3c7' : '#ffffff'};">
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${doc.employeeName}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${doc.documentType}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatDate(doc.expiryDate)}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: ${doc.daysRemaining <= 0 ? '#dc2626' : doc.daysRemaining <= 7 ? '#d97706' : '#059669'};">
                  ${doc.daysRemaining <= 0 ? 'EXPIRED' : `${doc.daysRemaining} days`}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Document Expiry Notification</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background-color: #f9fafb;">
      <div style="max-width: 800px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1f2937; margin: 0;">📋 Document Expiry Alert</h1>
          <p style="color: #6b7280; margin-top: 8px;">The following employee documents require attention</p>
        </div>
        
        ${buildTable(critical, "critical")}
        ${buildTable(warning, "warning")}
        
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>This is an automated notification from the HR Management System.</p>
          <p>Please take action on expiring documents to ensure compliance.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendEmail(config: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    // Use SMTPClient from Deno std library
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: config.host,
        port: config.port,
        tls: true,
        auth: {
          username: config.user,
          password: config.pass,
        },
      },
    });

    await client.send({
      from: config.from,
      to: config.to,
      subject: config.subject,
      content: "Please view this email in an HTML-compatible email client.",
      html: config.html,
    });

    await client.close();
    console.log("Email sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}
