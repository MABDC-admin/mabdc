-- Create table for company announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_departments TEXT[] DEFAULT NULL,
  target_employee_ids UUID[] DEFAULT NULL,
  send_push BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_announcements_published ON public.announcements(published_at DESC);
CREATE INDEX idx_announcements_expires ON public.announcements(expires_at);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admin and HR can manage announcements
CREATE POLICY "Admin and HR can view announcements" ON public.announcements
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Admin and HR can create announcements" ON public.announcements
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Admin and HR can update announcements" ON public.announcements
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Admin and HR can delete announcements" ON public.announcements
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'hr')
  );

-- Employees can view published announcements
CREATE POLICY "Employees can view published announcements" ON public.announcements
  FOR SELECT USING (
    public.has_role(auth.uid(), 'employee') AND 
    published_at IS NOT NULL AND 
    published_at <= now() AND 
    (expires_at IS NULL OR expires_at > now())
  );

-- Service role can manage all
CREATE POLICY "Service role can manage announcements" ON public.announcements
  FOR ALL USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();