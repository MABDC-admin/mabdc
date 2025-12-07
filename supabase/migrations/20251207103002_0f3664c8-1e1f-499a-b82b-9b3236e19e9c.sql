-- Create leave_types table for UAE-compliant leave categories
CREATE TABLE public.leave_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_arabic TEXT,
  max_days_per_year INTEGER NOT NULL,
  paid_type TEXT NOT NULL DEFAULT 'Paid' CHECK (paid_type IN ('Paid', 'Partially Paid', 'Unpaid')),
  requires_documentation BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT true,
  accrual_type TEXT DEFAULT 'yearly' CHECK (accrual_type IN ('monthly', 'yearly', 'immediate')),
  carry_forward_allowed BOOLEAN DEFAULT false,
  max_carry_forward_days INTEGER DEFAULT 0,
  gender_specific TEXT CHECK (gender_specific IN ('Male', 'Female', NULL)),
  min_service_months INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leave_balances table for tracking employee entitlements
CREATE TABLE public.leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  entitled_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  used_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  carried_forward_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  pending_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

-- Create public_holidays table
CREATE TABLE public.public_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_arabic TEXT,
  is_half_day BOOLEAN DEFAULT false,
  year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::INTEGER) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to leave_records for enhanced tracking
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS leave_type_id UUID REFERENCES public.leave_types(id);
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.employees(id);
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS working_days INTEGER;
ALTER TABLE public.leave_records ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all tables
CREATE POLICY "Allow all access to leave_types" ON public.leave_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to leave_balances" ON public.leave_balances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to public_holidays" ON public.public_holidays FOR ALL USING (true) WITH CHECK (true);

-- Insert UAE-compliant leave types
INSERT INTO public.leave_types (code, name, name_arabic, max_days_per_year, paid_type, requires_documentation, accrual_type, carry_forward_allowed, max_carry_forward_days, gender_specific, min_service_months, description) VALUES
('ANNUAL', 'Annual Leave', 'إجازة سنوية', 30, 'Paid', false, 'monthly', true, 15, NULL, 6, 'Standard annual leave as per UAE Labour Law Article 29. Accrues at 2.5 days/month after 6 months service.'),
('SICK_FULL', 'Sick Leave (Full Pay)', 'إجازة مرضية مدفوعة بالكامل', 15, 'Paid', true, 'yearly', false, 0, NULL, 3, 'First 15 days of sick leave at full pay per UAE Labour Law Article 31.'),
('SICK_HALF', 'Sick Leave (Half Pay)', 'إجازة مرضية مدفوعة جزئياً', 30, 'Partially Paid', true, 'yearly', false, 0, NULL, 3, 'Days 16-45 of sick leave at half pay per UAE Labour Law Article 31.'),
('SICK_UNPAID', 'Sick Leave (Unpaid)', 'إجازة مرضية غير مدفوعة', 45, 'Unpaid', true, 'yearly', false, 0, NULL, 3, 'Days 46-90 of sick leave without pay per UAE Labour Law Article 31.'),
('MATERNITY', 'Maternity Leave', 'إجازة أمومة', 60, 'Paid', true, 'immediate', false, 0, 'Female', 0, '60 days maternity leave (45 full pay + 15 half pay) per UAE Labour Law Article 30.'),
('PATERNITY', 'Paternity Leave', 'إجازة أبوة', 5, 'Paid', true, 'immediate', false, 0, 'Male', 0, '5 days paternity leave within 6 months of birth per UAE Labour Law.'),
('BEREAVEMENT', 'Compassionate Leave', 'إجازة عزاء', 5, 'Paid', true, 'immediate', false, 0, NULL, 0, '5 days for spouse/parent/child death, 3 days for other relatives per UAE Labour Law Article 32.'),
('STUDY', 'Study Leave', 'إجازة دراسية', 10, 'Paid', true, 'yearly', false, 0, NULL, 24, '10 days study leave per year for UAE-based studies after 2 years service per Article 33.'),
('HAJJ', 'Hajj Leave', 'إجازة حج', 30, 'Unpaid', true, 'immediate', false, 0, NULL, 12, 'Once during employment, 30 days unpaid leave for Hajj pilgrimage per UAE Labour Law.'),
('UNPAID', 'Unpaid Leave', 'إجازة بدون راتب', 90, 'Unpaid', false, 'yearly', false, 0, NULL, 0, 'Unpaid leave subject to management approval.');

-- Trigger for updated_at on leave_balances
CREATE TRIGGER update_leave_balances_updated_at
BEFORE UPDATE ON public.leave_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();