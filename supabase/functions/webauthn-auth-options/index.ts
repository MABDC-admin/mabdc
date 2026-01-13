import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random challenge
function generateChallenge(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("User lookup error:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to lookup user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Don't reveal if user exists or not
      return new Response(
        JSON.stringify({ error: "No passkeys found for this account" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's passkeys
    const { data: passkeys, error: passkeyError } = await supabase
      .from("user_passkeys")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    if (passkeyError || !passkeys || passkeys.length === 0) {
      return new Response(
        JSON.stringify({ error: "No passkeys found for this account" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate challenge
    const challenge = generateChallenge();

    // Clean up old challenges for this email
    await supabase
      .from("webauthn_challenges")
      .delete()
      .eq("email", email.toLowerCase())
      .eq("type", "authentication");

    // Store the challenge
    const { error: challengeError } = await supabase
      .from("webauthn_challenges")
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        challenge,
        type: "authentication",
      });

    if (challengeError) {
      console.error("Challenge storage error:", challengeError);
      return new Response(
        JSON.stringify({ error: "Failed to create challenge" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the origin from the request
    const origin = req.headers.get("Origin") || "https://example.com";
    const rpId = new URL(origin).hostname;

    // Build authentication options
    const options = {
      challenge,
      timeout: 60000,
      rpId,
      userVerification: "required",
      allowCredentials: passkeys.map((pk) => ({
        id: pk.credential_id,
        type: "public-key",
        transports: pk.transports || ["internal"],
      })),
    };

    return new Response(
      JSON.stringify({ options, userId: user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("WebAuthn auth options error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
