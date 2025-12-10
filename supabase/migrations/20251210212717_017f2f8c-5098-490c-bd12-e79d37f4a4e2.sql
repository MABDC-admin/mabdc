
-- Create employee_shifts table for shift assignments
CREATE TABLE public.employee_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_type text NOT NULL CHECK (shift_type IN ('morning', 'afternoon')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

-- Enable RLS
ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;

-- Create policy for all access
CREATE POLICY "Allow all access to employee_shifts" 
ON public.employee_shifts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_employee_shifts_updated_at
BEFORE UPDATE ON public.employee_shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for shift types
COMMENT ON COLUMN public.employee_shifts.shift_type IS 'morning = 08:00-17:00, afternoon = 10:00-19:00';
