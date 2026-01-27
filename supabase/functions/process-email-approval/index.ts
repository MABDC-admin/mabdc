import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "text/html; charset=utf-8",
};

function generateResultPage(success: boolean, message: string, details: string = ""): string {
  const bgColor = success ? "#10b981" : "#ef4444";
  const icon = success ? "✅" : "❌";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${success ? 'Approved' : 'Error'} - MABDC HRMS</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.1);
      padding: 48px;
      text-align: center;
      max-width: 480px;
      margin: 20px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 16px 0;
    }
    .message {
      font-size: 16px;
      color: #6b7280;
      margin: 0 0 24px 0;
      line-height: 1.6;
    }
    .details {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      font-size: 14px;
      color: #374151;
      text-align: left;
      margin-bottom: 24px;
    }
    .status-badge {
      display: inline-block;
      background: ${bgColor};
      color: white;
      padding: 8px 24px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .footer {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <div class="status-badge">${success ? 'Action Completed' : 'Action Failed'}</div>
    <h1 class="title">${message}</h1>
    ${details ? `<div class="details">${details}</div>` : ''}
    <p class="message">
      ${success 
        ? 'The employee has been notified via email about this decision.' 
        : 'Please try again or log in to the HRMS dashboard to complete this action.'}
    </p>
    <div class="footer">
      MABDC Human Resource Management System
    </div>
  </div>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("process-email-approval function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse URL parameters
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    
    if (!token) {
      return new Response(
        generateResultPage(false, "Invalid Request", "Missing approval token."),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the approval token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("email_approval_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenRecord) {
      console.error("Token not found:", tokenError);
      return new Response(
        generateResultPage(false, "Invalid Token", "This approval link is invalid or has already been used."),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return new Response(
        generateResultPage(false, "Link Expired", "This approval link has expired. Please log in to the HRMS dashboard to process this request."),
        { status: 410, headers: corsHeaders }
      );
    }

    // Check if token has already been used
    if (tokenRecord.used_at) {
      return new Response(
        generateResultPage(false, "Already Processed", "This request has already been processed."),
        { status: 409, headers: corsHeaders }
      );
    }

    let resultMessage = "";
    let resultDetails = "";

    // Process based on request type
    if (tokenRecord.request_type === "leave_request") {
      // Fetch leave record
      const { data: leaveRecord, error: leaveError } = await supabase
        .from("leave_records")
        .select(`
          *,
          employees!leave_records_employee_id_fkey (
            full_name,
            work_email
          )
        `)
        .eq("id", tokenRecord.request_id)
        .single();

      if (leaveError || !leaveRecord) {
        return new Response(
          generateResultPage(false, "Request Not Found", "The leave request could not be found."),
          { status: 404, headers: corsHeaders }
        );
      }

      if (leaveRecord.status !== "Pending") {
        return new Response(
          generateResultPage(false, "Already Processed", `This leave request has already been ${leaveRecord.status.toLowerCase()}.`),
          { status: 409, headers: corsHeaders }
        );
      }

      // Update leave record
      const newStatus = tokenRecord.action === "approve" ? "Approved" : "Rejected";
      const { error: updateError } = await supabase
        .from("leave_records")
        .update({
          status: newStatus,
          approved_at: new Date().toISOString(),
          approved_by: null, // Email approval doesn't have a user context
        })
        .eq("id", tokenRecord.request_id);

      if (updateError) {
        console.error("Failed to update leave record:", updateError);
        return new Response(
          generateResultPage(false, "Update Failed", "Failed to update the leave request."),
          { status: 500, headers: corsHeaders }
        );
      }

      resultMessage = `Leave Request ${newStatus}`;
      resultDetails = `
        <strong>Employee:</strong> ${leaveRecord.employees?.full_name || 'Unknown'}<br>
        <strong>Leave Type:</strong> ${leaveRecord.leave_type}<br>
        <strong>Duration:</strong> ${leaveRecord.start_date} to ${leaveRecord.end_date}<br>
        <strong>Days:</strong> ${leaveRecord.days_count}
      `;

      // Trigger notification to employee
      try {
        await supabase.functions.invoke("send-leave-decision-notification", {
          body: { leave_id: tokenRecord.request_id }
        });
      } catch (notifyError) {
        console.error("Failed to send employee notification:", notifyError);
      }

    } else if (tokenRecord.request_type === "attendance_appeal") {
      // Fetch appeal record
      const { data: appealRecord, error: appealError } = await supabase
        .from("attendance_appeals")
        .select(`
          *,
          employees!attendance_appeals_employee_id_fkey (
            full_name,
            work_email
          )
        `)
        .eq("id", tokenRecord.request_id)
        .single();

      if (appealError || !appealRecord) {
        return new Response(
          generateResultPage(false, "Request Not Found", "The attendance appeal could not be found."),
          { status: 404, headers: corsHeaders }
        );
      }

      if (appealRecord.status !== "Pending") {
        return new Response(
          generateResultPage(false, "Already Processed", `This appeal has already been ${appealRecord.status.toLowerCase()}.`),
          { status: 409, headers: corsHeaders }
        );
      }

      // Update appeal record
      const newStatus = tokenRecord.action === "approve" ? "Approved" : "Rejected";
      const { error: updateError } = await supabase
        .from("attendance_appeals")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: "Email Approval",
        })
        .eq("id", tokenRecord.request_id);

      if (updateError) {
        console.error("Failed to update appeal record:", updateError);
        return new Response(
          generateResultPage(false, "Update Failed", "Failed to update the appeal."),
          { status: 500, headers: corsHeaders }
        );
      }

      // If approved, update or create attendance record
      if (tokenRecord.action === "approve") {
        const { data: existingAttendance } = await supabase
          .from("attendance")
          .select("id")
          .eq("employee_id", appealRecord.employee_id)
          .eq("date", appealRecord.appeal_date)
          .single();

        if (existingAttendance) {
          await supabase
            .from("attendance")
            .update({
              check_in: appealRecord.requested_check_in,
              check_out: appealRecord.requested_check_out,
              status: "Appealed",
              modified_at: new Date().toISOString(),
              modified_by: "Email Approval",
            })
            .eq("id", existingAttendance.id);
        } else {
          await supabase
            .from("attendance")
            .insert({
              employee_id: appealRecord.employee_id,
              date: appealRecord.appeal_date,
              check_in: appealRecord.requested_check_in,
              check_out: appealRecord.requested_check_out,
              status: "Appealed",
              modified_by: "Email Approval",
            });
        }
      }

      resultMessage = `Attendance Appeal ${newStatus}`;
      resultDetails = `
        <strong>Employee:</strong> ${appealRecord.employees?.full_name || 'Unknown'}<br>
        <strong>Appeal Date:</strong> ${appealRecord.appeal_date}<br>
        <strong>Requested Check-In:</strong> ${appealRecord.requested_check_in || 'N/A'}<br>
        <strong>Requested Check-Out:</strong> ${appealRecord.requested_check_out || 'N/A'}
      `;

      // Trigger notification to employee
      try {
        await supabase.functions.invoke("send-appeal-decision-notification", {
          body: { appeal_id: tokenRecord.request_id }
        });
      } catch (notifyError) {
        console.error("Failed to send employee notification:", notifyError);
      }
    }

    // Mark token as used
    await supabase
      .from("email_approval_tokens")
      .update({
        used_at: new Date().toISOString(),
        used_by: "Email Link",
      })
      .eq("id", tokenRecord.id);

    console.log(`Successfully processed ${tokenRecord.request_type} ${tokenRecord.action}`);

    return new Response(
      generateResultPage(true, resultMessage, resultDetails),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in process-email-approval:", errorMessage);
    
    return new Response(
      generateResultPage(false, "Error", errorMessage),
      { status: 500, headers: corsHeaders }
    );
  }
};

serve(handler);
