-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hrms_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  job_position TEXT NOT NULL,
  department TEXT NOT NULL,
  joining_date DATE NOT NULL,
  manager TEXT,
  work_email TEXT NOT NULL,
  work_phone TEXT NOT NULL,
  nationality TEXT,
  basic_salary NUMERIC,
  allowance NUMERIC,
  leave_balance INTEGER DEFAULT 30,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Terminated')),
  visa_no TEXT,
  visa_expiration DATE,
  emirates_id TEXT,
  emirates_id_expiry DATE,
  passport_no TEXT,
  passport_expiry DATE,
  contract_type TEXT DEFAULT 'Unlimited',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  mohre_contract_no TEXT NOT NULL UNIQUE,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('Unlimited', 'Limited', 'Part-time', 'Temporary')),
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Active', 'Expired', 'Terminated')),
  start_date DATE NOT NULL,
  end_date DATE,
  basic_salary NUMERIC NOT NULL,
  total_salary NUMERIC,
  work_location TEXT,
  job_title_arabic TEXT,
  working_hours INTEGER DEFAULT 48,
  notice_period INTEGER DEFAULT 30,
  annual_leave_days INTEGER DEFAULT 30,
  probation_period INTEGER DEFAULT 6,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leave_records table
CREATE TABLE public.leave_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Annual', 'Sick', 'Maternity', 'Emergency', 'Unpaid')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Late', 'Half Day')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payroll table
CREATE TABLE public.payroll (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  basic_salary NUMERIC NOT NULL,
  allowances NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  net_salary NUMERIC NOT NULL,
  wps_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create eos_records table
CREATE TABLE public.eos_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  years_of_service NUMERIC NOT NULL,
  basic_salary NUMERIC NOT NULL,
  gratuity_amount NUMERIC NOT NULL,
  reason TEXT,
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables (allowing public access for now - can add auth later)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eos_records ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (can be replaced with auth-based policies later)
CREATE POLICY "Allow all access to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to leave_records" ON public.leave_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payroll" ON public.payroll FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to eos_records" ON public.eos_records FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();