-- Add deactivation tracking fields to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT,
ADD COLUMN IF NOT EXISTS last_working_day DATE,
ADD COLUMN IF NOT EXISTS deactivated_by UUID;

-- Update the status check constraint to include Resigned and Terminated
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_status_check;
ALTER TABLE public.employees 
ADD CONSTRAINT employees_status_check 
CHECK (status IN ('Active', 'On Leave', 'Resigned', 'Terminated'));