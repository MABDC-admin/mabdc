import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Decode base64url to Uint8Array
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Parse authenticator data
function parseAuthenticatorData(authData: Uint8Array): {
  rpIdHash: Uint8Array;
  flags: number;
  signCount: number;
} {
  // RP ID Hash (32 bytes)
  const rpIdHash = authData.slice(0, 32);
  
  // Flags (1 byte)
  const flags = authData[32];
  
  // Sign count (4 bytes, big-endian)
  const signCount = new DataView(authData.buffer, authData.byteOffset + 33, 4).getUint32(0);

  return { rpIdHash, flags, signCount };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, credential } = await req.json();

    if (!email || !credential || !credential.id || !credential.response) {
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the stored challenge
    const { data: challengeData, error: challengeError } = await supabase
      .from("webauthn_challenges")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("type", "authentication")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (challengeError || !challengeData) {
      return new Response(
        JSON.stringify({ error: "Challenge not found or expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the challenge matches
    const clientDataJSON = base64UrlDecode(credential.response.clientDataJSON);
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

    if (clientData.challenge !== challengeData.challenge) {
      return new Response(
        JSON.stringify({ error: "Challenge mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (clientData.type !== "webauthn.get") {
      return new Response(
        JSON.stringify({ error: "Invalid ceremony type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the passkey
    const { data: passkey, error: passkeyError } = await supabase
      .from("user_passkeys")
      .select("*")
      .eq("credential_id", credential.id)
      .eq("user_id", challengeData.user_id)
      .single();

    if (passkeyError || !passkey) {
      return new Response(
        JSON.stringify({ error: "Passkey not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse authenticator data and verify counter
    const authenticatorData = base64UrlDecode(credential.response.authenticatorData);
    const parsedData = parseAuthenticatorData(authenticatorData);

    // Verify user presence flag
    if (!(parsedData.flags & 0x01)) {
      return new Response(
        JSON.stringify({ error: "User presence not verified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check counter to prevent replay attacks
    if (parsedData.signCount > 0 && parsedData.signCount <= passkey.counter) {
      console.error("Possible credential cloning detected");
      return new Response(
        JSON.stringify({ error: "Security error: possible credential cloning" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the counter and last used time
    await supabase
      .from("user_passkeys")
      .update({
        counter: parsedData.signCount,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", passkey.id);

    // Clean up the challenge
    await supabase
      .from("webauthn_challenges")
      .delete()
      .eq("id", challengeData.id);

    // Generate a magic link token for the user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${clientData.origin}/employee-portal`,
      },
    });

    if (linkError || !linkData) {
      console.error("Failed to generate session:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the token from the magic link
    const token = linkData.properties?.hashed_token;
    
    // Verify the user and get session directly
    const { data: verifyData, error: verifyError } = await supabase.auth.admin.getUserById(
      challengeData.user_id
    );

    if (verifyError || !verifyData.user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the OTP link directly - client will use verifyOtp
    return new Response(
      JSON.stringify({ 
        success: true,
        email: email,
        tokenHash: token,
        type: "magiclink",
        // For direct session creation, we'll use a different approach
        redirectUrl: linkData.properties?.action_link,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("WebAuthn auth verify error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
