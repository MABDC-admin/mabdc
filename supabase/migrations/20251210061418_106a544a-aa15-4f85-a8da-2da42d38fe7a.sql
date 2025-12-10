-- Add private information fields to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS birthday date,
ADD COLUMN IF NOT EXISTS personal_email text,
ADD COLUMN IF NOT EXISTS personal_phone text,
ADD COLUMN IF NOT EXISTS home_address text,
ADD COLUMN IF NOT EXISTS place_of_birth text,
ADD COLUMN IF NOT EXISTS country_of_birth text,
ADD COLUMN IF NOT EXISTS family_status text,
ADD COLUMN IF NOT EXISTS number_of_children integer DEFAULT 0;

-- Create education table for employee education history
CREATE TABLE IF NOT EXISTS public.employee_education (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  certificate_level text NOT NULL,
  field_of_study text,
  school text,
  graduation_year integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on education table
ALTER TABLE public.employee_education ENABLE ROW LEVEL SECURITY;

-- RLS policy for education
CREATE POLICY "Allow all access to employee_education" 
ON public.employee_education 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add remarks columns to attendance table for admin and employee comments
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS employee_remarks text,
ADD COLUMN IF NOT EXISTS admin_remarks text,
ADD COLUMN IF NOT EXISTS modified_by text,
ADD COLUMN IF NOT EXISTS modified_at timestamp with time zone;