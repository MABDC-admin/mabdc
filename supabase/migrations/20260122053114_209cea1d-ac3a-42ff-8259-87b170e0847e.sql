-- Add itemized salary columns to payroll table
ALTER TABLE public.payroll 
ADD COLUMN IF NOT EXISTS housing_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS transportation_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ticket_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_allowances NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS deduction_reason TEXT;

-- Add index for better payroll query performance
CREATE INDEX IF NOT EXISTS idx_payroll_month ON public.payroll (month);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_month ON public.payroll (employee_id, month);