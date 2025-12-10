-- Create attendance_appeals table for employee time corrections
CREATE TABLE public.attendance_appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  appeal_date DATE NOT NULL,
  requested_check_in TIME WITHOUT TIME ZONE,
  requested_check_out TIME WITHOUT TIME ZONE,
  appeal_message TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_appeals ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to attendance_appeals" 
ON public.attendance_appeals 
FOR ALL 
USING (true) 
WITH CHECK (true);