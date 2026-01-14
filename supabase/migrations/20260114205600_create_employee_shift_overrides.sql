-- Create employee_shift_overrides table for daily-specific shift assignments
-- This allows HR to assign flexible/temporary schedules to individual employees for specific dates
-- Overrides take precedence over permanent shift assignments in employee_shifts table

CREATE TABLE public.employee_shift_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  shift_start_time time NOT NULL,
  shift_end_time time NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT employee_shift_overrides_unique_employee_date UNIQUE(employee_id, override_date),
  CONSTRAINT employee_shift_overrides_valid_times CHECK (shift_end_time > shift_start_time)
);

-- Create index for efficient lookups by date and employee
CREATE INDEX idx_employee_shift_overrides_date ON public.employee_shift_overrides(override_date);
CREATE INDEX idx_employee_shift_overrides_employee_date ON public.employee_shift_overrides(employee_id, override_date);

-- Enable RLS
ALTER TABLE public.employee_shift_overrides ENABLE ROW LEVEL SECURITY;

-- Create policy for all access (authenticated users)
CREATE POLICY "Allow authenticated users to manage shift overrides" 
ON public.employee_shift_overrides 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_employee_shift_overrides_updated_at
BEFORE UPDATE ON public.employee_shift_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE public.employee_shift_overrides IS 'Daily-specific shift overrides that take precedence over permanent shift assignments. Used for flexible schedules, special arrangements, or retroactive corrections.';
COMMENT ON COLUMN public.employee_shift_overrides.override_date IS 'The specific date this override applies to';
COMMENT ON COLUMN public.employee_shift_overrides.shift_start_time IS 'Custom start time for this employee on this date';
COMMENT ON COLUMN public.employee_shift_overrides.shift_end_time IS 'Custom end time for this employee on this date';
COMMENT ON COLUMN public.employee_shift_overrides.reason IS 'Optional explanation for why this override was created (e.g., "Doctor appointment", "Flexible hours approved")';
COMMENT ON COLUMN public.employee_shift_overrides.created_by IS 'The user (typically HR) who created this override';
