-- Create table for email sending history
CREATE TABLE public.email_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'payslip',
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resend_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

-- Create policy for admin/HR access
CREATE POLICY "Admins and HR can manage email history"
ON public.email_history
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'hr')
  )
);

-- Create index for faster lookups
CREATE INDEX idx_email_history_employee ON public.email_history(employee_id);
CREATE INDEX idx_email_history_sent_at ON public.email_history(sent_at DESC);