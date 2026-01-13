-- Create table to store WebAuthn passkeys/credentials
CREATE TABLE public.user_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  device_name TEXT,
  transports TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Create index for faster lookups
CREATE INDEX idx_user_passkeys_user_id ON public.user_passkeys(user_id);
CREATE INDEX idx_user_passkeys_credential_id ON public.user_passkeys(credential_id);

-- Enable RLS
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

-- Users can view their own passkeys
CREATE POLICY "Users can view own passkeys" ON public.user_passkeys
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own passkeys
CREATE POLICY "Users can insert own passkeys" ON public.user_passkeys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own passkeys (for counter updates)
CREATE POLICY "Users can update own passkeys" ON public.user_passkeys
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own passkeys
CREATE POLICY "Users can delete own passkeys" ON public.user_passkeys
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all passkeys (needed for edge functions)
CREATE POLICY "Service role can manage all passkeys" ON public.user_passkeys
  FOR ALL USING (auth.role() = 'service_role');

-- Create table for storing temporary WebAuthn challenges
CREATE TABLE public.webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes')
);

-- Index for cleanup and lookup
CREATE INDEX idx_webauthn_challenges_expires ON public.webauthn_challenges(expires_at);
CREATE INDEX idx_webauthn_challenges_email ON public.webauthn_challenges(email);

-- Enable RLS
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- Only service role can manage challenges
CREATE POLICY "Service role can manage challenges" ON public.webauthn_challenges
  FOR ALL USING (auth.role() = 'service_role');