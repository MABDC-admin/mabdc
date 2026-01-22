import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const handler = async (req: Request): Promise<Response> => {
  console.log("process-deletion-approval function called");

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const action = url.searchParams.get("action");

  console.log(`Processing action: ${action} with token: ${token}`);

  const generateHtmlResponse = (title: string, message: string, success: boolean) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 40px;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: ${success ? '#16a34a' : '#dc2626'};
          margin: 0 0 15px 0;
        }
        p {
          color: #4b5563;
          line-height: 1.6;
          margin: 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          color: #9ca3af;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${success ? '✅' : '❌'}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="footer">MABDC HR Management System</div>
      </div>
    </body>
    </html>
  `;

  if (!token || !action) {
    return new Response(
      generateHtmlResponse("Invalid Request", "Missing token or action parameter.", false),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  if (action !== "approve" && action !== "reject") {
    return new Response(
      generateHtmlResponse("Invalid Action", "Action must be 'approve' or 'reject'.", false),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the pending deletion
    const { data: pendingDeletion, error: fetchError } = await supabase
      .from("pending_deletions")
      .select("*")
      .eq("approval_token", token)
      .single();

    if (fetchError || !pendingDeletion) {
      console.error("Token not found:", fetchError);
      return new Response(
        generateHtmlResponse("Request Not Found", "This deletion request was not found or may have already been processed.", false),
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    if (pendingDeletion.status !== "pending") {
      return new Response(
        generateHtmlResponse(
          "Already Processed",
          `This deletion request was already ${pendingDeletion.status} on ${new Date(pendingDeletion.processed_at).toLocaleString()}.`,
          false
        ),
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    const recordType = pendingDeletion.record_type;
    const recordId = pendingDeletion.record_id;

    if (action === "approve") {
      console.log(`Approving deletion of ${recordType} with ID ${recordId}`);

      // Perform the actual deletion based on record type
      let deleteError: Error | null = null;

      switch (recordType) {
        case "employee": {
          const { error } = await supabase.from("employees").delete().eq("id", recordId);
          if (error) deleteError = error;
          break;
        }
        case "payroll": {
          const { error } = await supabase.from("payroll").delete().eq("id", recordId);
          if (error) deleteError = error;
          break;
        }
        case "attendance": {
          const { error } = await supabase.from("attendance").delete().eq("id", recordId);
          if (error) deleteError = error;
          break;
        }
        case "leave": {
          const { error } = await supabase.from("leave_records").delete().eq("id", recordId);
          if (error) deleteError = error;
          break;
        }
        case "contract": {
          const { error } = await supabase.from("contracts").delete().eq("id", recordId);
          if (error) deleteError = error;
          break;
        }
        case "document": {
          const { error } = await supabase.from("employee_documents").delete().eq("id", recordId);
          if (error) deleteError = error;
          break;
        }
        case "ticket_allowance": {
          const { error } = await supabase.from("ticket_allowance_records").delete().eq("id", recordId);
          if (error) deleteError = error;
          break;
        }
        case "discipline": {
          const { error } = await supabase.from("employee_discipline").delete().eq("id", recordId);
          if (error) deleteError = error;
          break;
        }
        case "performance": {
          const { error } = await supabase.from("employee_performance").delete().eq("id", recordId);
          if (error) deleteError = error;
          break;
        }
        case "corrective_action": {
          const { error } = await supabase.from("employee_corrective_actions").delete().eq("id", recordId);
          if (error) deleteError = error;
          break;
        }
        default:
          return new Response(
            generateHtmlResponse("Unknown Record Type", `Cannot process deletion for record type: ${recordType}`, false),
            { status: 400, headers: { "Content-Type": "text/html" } }
          );
      }

      if (deleteError) {
        console.error("Deletion error:", deleteError);
        return new Response(
          generateHtmlResponse("Deletion Failed", `Failed to delete the record: ${deleteError.message}`, false),
          { status: 500, headers: { "Content-Type": "text/html" } }
        );
      }

      // Update pending deletion status
      await supabase
        .from("pending_deletions")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
          processed_by: "sottodennis@gmail.com",
        })
        .eq("id", pendingDeletion.id);

      console.log(`Successfully deleted ${recordType} record`);

      const recordData = pendingDeletion.record_data as Record<string, unknown>;
      const recordName = recordData.full_name || recordData.name || recordData.month || recordId;

      return new Response(
        generateHtmlResponse(
          "Deletion Approved",
          `The ${recordType} record "${recordName}" has been permanently deleted.`,
          true
        ),
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    } else {
      // Reject the deletion
      console.log(`Rejecting deletion of ${recordType} with ID ${recordId}`);

      await supabase
        .from("pending_deletions")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
          processed_by: "sottodennis@gmail.com",
        })
        .eq("id", pendingDeletion.id);

      const recordData = pendingDeletion.record_data as Record<string, unknown>;
      const recordName = recordData.full_name || recordData.name || recordData.month || recordId;

      return new Response(
        generateHtmlResponse(
          "Deletion Rejected",
          `The deletion request for ${recordType} record "${recordName}" has been rejected. The record will remain in the system.`,
          true
        ),
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing deletion approval:", errorMessage);
    return new Response(
      generateHtmlResponse("Error", `An error occurred: ${errorMessage}`, false),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
};

serve(handler);
