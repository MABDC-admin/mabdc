-- Create pending_deletions table for approval workflow
CREATE TABLE public.pending_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  record_data JSONB NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  requested_by_email TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  approval_token UUID DEFAULT gen_random_uuid() UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  processed_at TIMESTAMPTZ,
  processed_by TEXT
);

-- Enable RLS
ALTER TABLE public.pending_deletions ENABLE ROW LEVEL SECURITY;

-- Index for fast token lookups
CREATE INDEX idx_pending_deletions_token ON public.pending_deletions(approval_token);
CREATE INDEX idx_pending_deletions_status ON public.pending_deletions(status);

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role can manage pending deletions"
  ON public.pending_deletions
  FOR ALL
  USING (auth.role() = 'service_role');

-- HR/Admin can create and view pending deletions
CREATE POLICY "Admin and HR can manage pending deletions"
  ON public.pending_deletions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'hr')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'hr')
  ));