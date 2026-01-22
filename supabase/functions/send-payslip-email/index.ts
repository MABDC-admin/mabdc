import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayslipEmailRequest {
  employeeName: string;
  employeeEmail: string;
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

  try {
    const {
      employeeName,
      employeeEmail,
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

    const nameParts = employeeName.split(' ');
    const firstName = nameParts[0];
    const filename = `Payslip-${employeeName.replace(/\s+/g, '-')}-${month.replace(/\s+/g, '-')}.pdf`;

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

    // Build multipart email with attachment
    const boundary = `----=_Part_${Date.now()}`;
    const CRLF = "\r\n";
    
    let emailBody = "";
    emailBody += `--${boundary}${CRLF}`;
    emailBody += `Content-Type: text/html; charset=utf-8${CRLF}`;
    emailBody += `Content-Transfer-Encoding: quoted-printable${CRLF}${CRLF}`;
    emailBody += emailHtml + CRLF;
    emailBody += `--${boundary}${CRLF}`;
    emailBody += `Content-Type: application/pdf; name="${filename}"${CRLF}`;
    emailBody += `Content-Disposition: attachment; filename="${filename}"${CRLF}`;
    emailBody += `Content-Transfer-Encoding: base64${CRLF}${CRLF}`;
    emailBody += pdfBase64 + CRLF;
    emailBody += `--${boundary}--${CRLF}`;

    const SMTP_HOST = Deno.env.get("SMTP_HOST") || "";
    const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const SMTP_USER = Deno.env.get("SMTP_USER") || "";
    const SMTP_PASS = Deno.env.get("SMTP_PASS") || "";
    const SMTP_FROM_EMAIL = Deno.env.get("SMTP_FROM_EMAIL") || SMTP_USER;

    // Use Deno's built-in TCP connection for SMTP
    const conn = await Deno.connect({
      hostname: SMTP_HOST,
      port: SMTP_PORT,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const send = async (data: string) => {
      await conn.write(encoder.encode(data + CRLF));
    };

    const read = async (): Promise<string> => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      return n ? decoder.decode(buffer.subarray(0, n)) : "";
    };

    // SMTP conversation
    await read(); // Server greeting
    await send(`EHLO ${SMTP_HOST}`);
    await read();
    
    // Start TLS
    await send("STARTTLS");
    const starttlsResponse = await read();
    
    if (starttlsResponse.includes("220")) {
      // Upgrade to TLS
      const tlsConn = await Deno.startTls(conn, { hostname: SMTP_HOST });
      
      const tlsSend = async (data: string) => {
        await tlsConn.write(encoder.encode(data + CRLF));
      };

      const tlsRead = async (): Promise<string> => {
        const buffer = new Uint8Array(4096);
        const n = await tlsConn.read(buffer);
        return n ? decoder.decode(buffer.subarray(0, n)) : "";
      };

      await tlsSend(`EHLO ${SMTP_HOST}`);
      await tlsRead();

      // Auth
      await tlsSend("AUTH LOGIN");
      await tlsRead();
      await tlsSend(btoa(SMTP_USER));
      await tlsRead();
      await tlsSend(btoa(SMTP_PASS));
      const authResponse = await tlsRead();
      
      if (!authResponse.includes("235")) {
        throw new Error("SMTP authentication failed: " + authResponse);
      }

      await tlsSend(`MAIL FROM:<${SMTP_FROM_EMAIL}>`);
      await tlsRead();
      await tlsSend(`RCPT TO:<${employeeEmail}>`);
      await tlsRead();
      await tlsSend("DATA");
      await tlsRead();

      // Send headers and body
      const headers = [
        `From: ${companyName} <${SMTP_FROM_EMAIL}>`,
        `To: ${employeeEmail}`,
        `Subject: Payslip for ${month} - ${employeeName}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        "",
        emailBody,
        ".",
      ].join(CRLF);

      await tlsSend(headers);
      await tlsRead();
      await tlsSend("QUIT");
      tlsConn.close();
    } else {
      conn.close();
      throw new Error("STARTTLS not supported");
    }

    console.log(`Payslip email sent successfully to ${employeeEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: `Payslip sent to ${employeeEmail}` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending payslip email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
