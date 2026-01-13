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

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user's session
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { deviceName } = await req.json();

    // Get existing passkeys to exclude
    const { data: existingPasskeys } = await supabase
      .from("user_passkeys")
      .select("credential_id")
      .eq("user_id", user.id);

    // Generate challenge
    const challenge = generateChallenge();

    // Clean up old challenges for this user
    await supabase
      .from("webauthn_challenges")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "registration");

    // Store the challenge
    const { error: challengeError } = await supabase
      .from("webauthn_challenges")
      .insert({
        user_id: user.id,
        email: user.email,
        challenge,
        type: "registration",
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

    // Build registration options
    const options = {
      challenge,
      rp: {
        name: "Employee Portal",
        id: rpId,
      },
      user: {
        id: btoa(user.id).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""),
        name: user.email,
        displayName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Employee",
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },   // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      excludeCredentials: (existingPasskeys || []).map((pk) => ({
        id: pk.credential_id,
        type: "public-key",
        transports: ["internal"],
      })),
    };

    return new Response(
      JSON.stringify({ options, deviceName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("WebAuthn register options error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
