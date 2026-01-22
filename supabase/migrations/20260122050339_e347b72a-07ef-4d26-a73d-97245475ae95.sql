-- Add ticket_allowance column to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS ticket_allowance NUMERIC(12,2) DEFAULT 0;

-- Create ticket_allowance_records table for tracking eligibility and processing
CREATE TABLE public.ticket_allowance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  eligibility_year INTEGER NOT NULL,
  eligibility_start_date DATE NOT NULL,
  amount NUMERIC(12,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'cancelled')),
  reminder_active BOOLEAN DEFAULT true,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  processed_in_payroll_id UUID REFERENCES payroll(id),
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, eligibility_year)
);

-- Create payroll_earnings table for itemized earnings
CREATE TABLE public.payroll_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
  earning_type TEXT NOT NULL CHECK (earning_type IN ('basic_salary', 'housing_allowance', 'transport_allowance', 'ticket_allowance', 'other_allowance')),
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create payroll_deductions table for itemized deductions with mandatory reason
CREATE TABLE public.payroll_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('lop', 'late', 'absence', 'loan', 'adjustment', 'other')),
  reason TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  days INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ticket_allowance_audit_log table for audit trail
CREATE TABLE public.ticket_allowance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_allowance_id UUID NOT NULL REFERENCES ticket_allowance_records(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'approved', 'processed', 'cancelled', 'reminder_dismissed', 'updated')),
  performed_by UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.ticket_allowance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_allowance_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_allowance_records
CREATE POLICY "Admins and HR can view all ticket allowance records"
ON public.ticket_allowance_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

CREATE POLICY "Admins and HR can manage ticket allowance records"
ON public.ticket_allowance_records FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

CREATE POLICY "Employees can view their own ticket allowance records"
ON public.ticket_allowance_records FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- RLS Policies for payroll_earnings
CREATE POLICY "Admins and HR can view all payroll earnings"
ON public.payroll_earnings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

CREATE POLICY "Admins and HR can manage payroll earnings"
ON public.payroll_earnings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

-- RLS Policies for payroll_deductions
CREATE POLICY "Admins and HR can view all payroll deductions"
ON public.payroll_deductions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

CREATE POLICY "Admins and HR can manage payroll deductions"
ON public.payroll_deductions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

-- RLS Policies for ticket_allowance_audit_log
CREATE POLICY "Admins and HR can view all audit logs"
ON public.ticket_allowance_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

CREATE POLICY "Admins and HR can create audit logs"
ON public.ticket_allowance_audit_log FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

-- Create updated_at trigger for ticket_allowance_records
CREATE TRIGGER update_ticket_allowance_records_updated_at
BEFORE UPDATE ON public.ticket_allowance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better query performance
CREATE INDEX idx_ticket_allowance_records_employee_id ON public.ticket_allowance_records(employee_id);
CREATE INDEX idx_ticket_allowance_records_status ON public.ticket_allowance_records(status);
CREATE INDEX idx_ticket_allowance_records_reminder_active ON public.ticket_allowance_records(reminder_active);
CREATE INDEX idx_payroll_earnings_payroll_id ON public.payroll_earnings(payroll_id);
CREATE INDEX idx_payroll_deductions_payroll_id ON public.payroll_deductions(payroll_id);
CREATE INDEX idx_ticket_allowance_audit_log_ticket_id ON public.ticket_allowance_audit_log(ticket_allowance_id);