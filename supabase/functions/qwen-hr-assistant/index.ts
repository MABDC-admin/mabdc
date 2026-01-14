import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, conversationHistory = [] } = await req.json();

    if (!query) {
      throw new Error("No query provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile to understand context
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    // Get recent HR statistics for context
    const today = new Date().toISOString().split('T')[0];
    
    const { data: employeeStats } = await supabase
      .from("employees")
      .select("status", { count: "exact", head: true });

    const { data: todayAttendance } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("date", today);

    const { data: pendingLeaves } = await supabase
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "Pending");

    const { data: activeContracts } = await supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("status", "Active");

    // Build context-aware system prompt
    const systemPrompt = `You are MABDC HR Assistant, an intelligent AI helper for the MABDC Human Resources Management System.

**Your Role:**
- Answer questions about HR policies, procedures, and data
- Help with leave management, attendance, payroll, and employee information
- Provide UAE labor law guidance
- Assist with contract and document management
- Offer insights and recommendations

**Current System Context:**
- User: ${profile?.full_name || "HR Admin"} (${profile?.role || "Admin"})
- Today's Date: ${today}
- Active Employees: ${employeeStats?.count || "N/A"}
- Today's Attendance Records: ${todayAttendance?.count || 0}
- Pending Leave Requests: ${pendingLeaves?.count || 0}
- Active Contracts: ${activeContracts?.count || 0}

**MABDC HR Policies (Context):**
- Standard Working Hours: 8 hours/day
- Annual Leave: 30 days (per UAE law)
- Probation Period: 6 months
- Notice Period: 30 days
- Default Work Location: Abu Dhabi
- Shift Times: Default 08:00-17:00, Flexible shifts available
- Undertime: Checked if checkout before shift end
- Late: Checked if checkin after shift start + 15 min grace period

**Available HR Modules:**
- Employee Management
- Attendance & Time Clock
- Leave Management (Annual, Sick, Emergency, Unpaid)
- Payroll & Salary
- Contracts (Limited/Unlimited)
- Document Management (Passport, Visa, Emirates ID, Work Permit, Insurance)
- Performance Reviews
- Discipline & Appeals
- Announcements
- Shift Overrides (flexible schedules)

**Instructions:**
1. Be helpful, professional, and concise
2. Reference specific data when available
3. Suggest actionable next steps
4. For data queries, explain what information the user can find in the system
5. For policy questions, cite UAE labor law when relevant
6. If you don't know something, say so honestly
7. Keep responses focused and under 200 words unless detailed explanation is needed

**Important:** You cannot directly execute actions in the system. You can only provide information, guidance, and recommendations.`;

    // Build conversation messages
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: query },
    ];

    console.log("Sending query to AI:", query);

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantResponse = aiData.choices?.[0]?.message?.content;

    if (!assistantResponse) {
      throw new Error("No response from AI");
    }

    console.log("AI Response received");

    return new Response(
      JSON.stringify({
        success: true,
        response: assistantResponse,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in qwen-hr-assistant:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
