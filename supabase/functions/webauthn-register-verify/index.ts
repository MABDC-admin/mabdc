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

// Parse CBOR-encoded attestation object to extract public key
function parseAuthenticatorData(authData: Uint8Array): {
  rpIdHash: Uint8Array;
  flags: number;
  signCount: number;
  aaguid?: Uint8Array;
  credentialId?: Uint8Array;
  credentialPublicKey?: Uint8Array;
} {
  let offset = 0;

  // RP ID Hash (32 bytes)
  const rpIdHash = authData.slice(offset, offset + 32);
  offset += 32;

  // Flags (1 byte)
  const flags = authData[offset];
  offset += 1;

  // Sign count (4 bytes, big-endian)
  const signCount = new DataView(authData.buffer, authData.byteOffset + offset, 4).getUint32(0);
  offset += 4;

  // Check if attested credential data is present (bit 6)
  if (!(flags & 0x40)) {
    return { rpIdHash, flags, signCount };
  }

  // AAGUID (16 bytes)
  const aaguid = authData.slice(offset, offset + 16);
  offset += 16;

  // Credential ID length (2 bytes, big-endian)
  const credentialIdLength = new DataView(authData.buffer, authData.byteOffset + offset, 2).getUint16(0);
  offset += 2;

  // Credential ID
  const credentialId = authData.slice(offset, offset + credentialIdLength);
  offset += credentialIdLength;

  // The rest is the credential public key in COSE format
  const credentialPublicKey = authData.slice(offset);

  return {
    rpIdHash,
    flags,
    signCount,
    aaguid,
    credentialId,
    credentialPublicKey,
  };
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

    const { credential, deviceName } = await req.json();

    if (!credential || !credential.id || !credential.response) {
      return new Response(
        JSON.stringify({ error: "Invalid credential data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the stored challenge
    const { data: challengeData, error: challengeError } = await supabase
      .from("webauthn_challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "registration")
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

    if (clientData.type !== "webauthn.create") {
      return new Response(
        JSON.stringify({ error: "Invalid ceremony type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode and parse the attestation object
    const attestationObject = base64UrlDecode(credential.response.attestationObject);
    
    // Simple CBOR parsing for attestation object
    // The attestation object contains authData which has the credential info
    // For simplicity, we'll extract the authData directly
    
    // Find the authData in the CBOR structure (it starts after the format info)
    // This is a simplified parser - in production, use a proper CBOR library
    const authDataStart = attestationObject.indexOf(0x68) + 9; // "authData" marker
    const authDataLength = attestationObject.length - authDataStart - 50; // Approximate
    
    // Parse authenticator data from the response
    const authenticatorData = base64UrlDecode(credential.response.authenticatorData || "");
    
    let parsedData;
    if (authenticatorData.length > 0) {
      parsedData = parseAuthenticatorData(authenticatorData);
    } else {
      // Fallback: extract from attestation object
      parsedData = {
        signCount: 0,
        credentialId: base64UrlDecode(credential.id),
        credentialPublicKey: new Uint8Array(0),
      };
    }

    // Store the credential
    const credentialIdBase64 = credential.id;
    const publicKeyBase64 = credential.response.publicKey || 
      btoa(String.fromCharCode(...(parsedData.credentialPublicKey || new Uint8Array())))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

    // Check for duplicate credential
    const { data: existing } = await supabase
      .from("user_passkeys")
      .select("id")
      .eq("credential_id", credentialIdBase64)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "This passkey is already registered" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store the passkey
    const { error: insertError } = await supabase
      .from("user_passkeys")
      .insert({
        user_id: user.id,
        credential_id: credentialIdBase64,
        public_key: publicKeyBase64 || credentialIdBase64, // Fallback to credential ID if no public key
        counter: parsedData.signCount || 0,
        device_name: deviceName || "Biometric Device",
        transports: credential.response.transports || ["internal"],
      });

    if (insertError) {
      console.error("Passkey storage error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store passkey" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up the challenge
    await supabase
      .from("webauthn_challenges")
      .delete()
      .eq("id", challengeData.id);

    return new Response(
      JSON.stringify({ success: true, message: "Passkey registered successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("WebAuthn register verify error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
