-- Add user_id column to employees table to link with auth users
ALTER TABLE public.employees 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_employees_user_id ON public.employees(user_id);

-- Create RLS policy for employees to view their own record
CREATE POLICY "Employees can view own record"
ON public.employees
FOR SELECT
USING (auth.uid() = user_id);

-- Create RLS policies for employee-specific tables
-- Attendance: employees can view their own
CREATE POLICY "Employees can view own attendance"
ON public.attendance
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Leave records: employees can view and create their own
CREATE POLICY "Employees can view own leave"
ON public.leave_records
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Employees can create own leave requests"
ON public.leave_records
FOR INSERT
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Contracts: employees can view their own
CREATE POLICY "Employees can view own contracts"
ON public.contracts
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- HR Letters: employees can view their own
CREATE POLICY "Employees can view own hr_letters"
ON public.hr_letters
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Employee documents: employees can view their own
CREATE POLICY "Employees can view own documents"
ON public.employee_documents
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Gamification: employees can view their own
CREATE POLICY "Employees can view own gamification"
ON public.gamification_points
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Employees can view own badges"
ON public.employee_badges
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Performance: employees can view their own
CREATE POLICY "Employees can view own performance"
ON public.employee_performance
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Discipline: employees can view their own
CREATE POLICY "Employees can view own discipline"
ON public.employee_discipline
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Attendance appeals: employees can view and create their own
CREATE POLICY "Employees can view own appeals"
ON public.attendance_appeals
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Employees can create own appeals"
ON public.attendance_appeals
FOR INSERT
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);