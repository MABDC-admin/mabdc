-- Rename home_address to current_address
ALTER TABLE employees RENAME COLUMN home_address TO current_address;

-- Add emergency contact columns to employees table
ALTER TABLE employees ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE employees ADD COLUMN emergency_contact_phone TEXT;
ALTER TABLE employees ADD COLUMN emergency_contact_relationship TEXT;

-- Add LOP (Loss of Pay) leave type
INSERT INTO leave_types (
  code, name, name_arabic, 
  max_days_per_year, paid_type, 
  requires_documentation, requires_approval,
  accrual_type, carry_forward_allowed, max_carry_forward_days,
  gender_specific, min_service_months, description, is_active
) VALUES (
  'LOP', 
  'Loss of Pay', 
  'إجازة بدون راتب',
  365,
  'Unpaid',
  false,
  true,
  'immediate',
  false,
  0,
  NULL,
  0,
  'Leave without pay. Days taken will be deducted from monthly salary at per-day rate (Basic Salary / 30).',
  true
);

-- Add LOP tracking columns to payroll table
ALTER TABLE payroll ADD COLUMN lop_days INTEGER DEFAULT 0;
ALTER TABLE payroll ADD COLUMN lop_deduction NUMERIC(12,2) DEFAULT 0;