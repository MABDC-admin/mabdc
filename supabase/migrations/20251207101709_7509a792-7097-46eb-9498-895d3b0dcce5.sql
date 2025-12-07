-- Enable realtime for attendance table
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;

-- Add hrms_no to employees select for QR lookup
CREATE INDEX IF NOT EXISTS idx_employees_hrms_no ON public.employees(hrms_no);