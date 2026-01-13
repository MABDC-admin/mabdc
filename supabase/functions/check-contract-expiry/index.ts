import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpiringContract {
  id: string;
  employee_id: string;
  mohre_contract_no: string;
  end_date: string;
  status: string;
  days_until_expiry: number;
  employees: {
    full_name: string;
    work_email: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking for expiring contracts...");

    // Get contracts expiring in the next 90 days
    const today = new Date().toISOString().split('T')[0];
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    const futureDate = ninetyDaysFromNow.toISOString().split('T')[0];

    const { data: expiringContracts, error: fetchError } = await supabase
      .from("contracts")
      .select(`
        id,
        employee_id,
        mohre_contract_no,
        end_date,
        status,
        employees (full_name, work_email)
      `)
      .not("end_date", "is", null)
      .gte("end_date", today)
      .lte("end_date", futureDate)
      .in("status", ["Active", "Approved"]);

    if (fetchError) {
      console.error("Error fetching contracts:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiringContracts?.length || 0} expiring contracts`);

    const notifications: { contract: string; employee: string; days: number; action: string }[] = [];

    for (const contract of expiringContracts || []) {
      const endDate = new Date(contract.end_date);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      // Update status based on days until expiry
      let newStatus = contract.status;
      let action = "none";

      if (daysUntilExpiry <= 0) {
        newStatus = "Expired";
        action = "marked_expired";
      } else if (daysUntilExpiry <= 14) {
        // Contract expiring very soon - critical (2 weeks)
        action = "critical_warning";
      } else if (daysUntilExpiry <= 30) {
        // Contract expiring soon - warning (30 days)
        action = "warning";
      } else if (daysUntilExpiry <= 60) {
        // Contract nearing expiry - notice (60 days)
        action = "notice";
      }

      // Update contract status if it changed
      if (newStatus !== contract.status) {
        const { error: updateError } = await supabase
          .from("contracts")
          .update({ status: newStatus })
          .eq("id", contract.id);

        if (updateError) {
          console.error(`Error updating contract ${contract.id}:`, updateError);
        } else {
          console.log(`Updated contract ${contract.id} status to ${newStatus}`);
        }
      }

      const employeeData = Array.isArray(contract.employees) ? contract.employees[0] : contract.employees;
      notifications.push({
        contract: contract.mohre_contract_no,
        employee: employeeData?.full_name || "Unknown",
        days: daysUntilExpiry,
        action,
      });
    }

    // Also check for already expired contracts that haven't been updated
    const { data: expiredContracts, error: expiredError } = await supabase
      .from("contracts")
      .select("id, mohre_contract_no")
      .not("end_date", "is", null)
      .lt("end_date", today)
      .neq("status", "Expired")
      .neq("status", "Terminated");

    if (!expiredError && expiredContracts) {
      for (const contract of expiredContracts) {
        const { error: updateError } = await supabase
          .from("contracts")
          .update({ status: "Expired" })
          .eq("id", contract.id);

        if (!updateError) {
          console.log(`Marked contract ${contract.mohre_contract_no} as expired`);
          notifications.push({
            contract: contract.mohre_contract_no,
            employee: "N/A",
            days: 0,
            action: "auto_expired",
          });
        }
      }
    }

    const response = {
      success: true,
      checked_at: new Date().toISOString(),
      expiring_contracts: expiringContracts?.length || 0,
      auto_expired: expiredContracts?.length || 0,
      notifications,
    };

    console.log("Contract expiry check complete:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in check-contract-expiry function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
