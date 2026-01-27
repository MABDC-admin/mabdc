-- Create table for email approval tokens
CREATE TABLE public.email_approval_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    request_type TEXT NOT NULL CHECK (request_type IN ('leave_request', 'attendance_appeal')),
    request_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    used_at TIMESTAMP WITH TIME ZONE,
    used_by TEXT
);

-- Enable RLS
ALTER TABLE public.email_approval_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role can manage approval tokens"
ON public.email_approval_tokens
FOR ALL
USING (auth.role() = 'service_role');

-- Allow HR/Admin to view tokens for audit
CREATE POLICY "HR and Admin can view approval tokens"
ON public.email_approval_tokens
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'hr')
));

-- Create index for faster token lookups
CREATE INDEX idx_email_approval_tokens_token ON public.email_approval_tokens(token);
CREATE INDEX idx_email_approval_tokens_request ON public.email_approval_tokens(request_type, request_id);