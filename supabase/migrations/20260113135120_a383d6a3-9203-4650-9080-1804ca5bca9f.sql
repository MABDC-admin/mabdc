-- Create table to track leave accrual history
CREATE TABLE public.leave_accrual_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_balance_id UUID NOT NULL REFERENCES public.leave_balances(id) ON DELETE CASCADE,
  accrual_date DATE NOT NULL,
  accrual_month INTEGER NOT NULL,
  accrual_year INTEGER NOT NULL,
  months_of_service INTEGER NOT NULL,
  accrual_rate NUMERIC(4,2) NOT NULL,
  days_accrued NUMERIC(5,2) NOT NULL,
  joining_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, accrual_month, accrual_year)
);

-- Enable RLS on leave_accrual_log
ALTER TABLE public.leave_accrual_log ENABLE ROW LEVEL SECURITY;

-- Allow all access for HR/admin operations
CREATE POLICY "Allow all access to leave_accrual_log" 
ON public.leave_accrual_log 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Employees can view their own accrual history
CREATE POLICY "Employees can view own accrual log" 
ON public.leave_accrual_log 
FOR SELECT 
USING (employee_id IN (
  SELECT employees.id FROM employees WHERE employees.user_id = auth.uid()
));

-- Create function to calculate and apply monthly leave accrual
CREATE OR REPLACE FUNCTION public.process_monthly_leave_accrual(target_month INTEGER DEFAULT NULL, target_year INTEGER DEFAULT NULL)
RETURNS TABLE(
  employee_id UUID,
  employee_name TEXT,
  joining_date DATE,
  months_of_service INTEGER,
  accrual_rate NUMERIC,
  days_accrued NUMERIC,
  new_entitled_days NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  process_month INTEGER;
  process_year INTEGER;
  annual_leave_type_id UUID;
  emp_record RECORD;
  balance_record RECORD;
  emp_months_service INTEGER;
  emp_accrual_rate NUMERIC(4,2);
  emp_days_accrued NUMERIC(5,2);
  new_balance NUMERIC(5,2);
BEGIN
  -- Default to current month/year if not specified
  process_month := COALESCE(target_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
  process_year := COALESCE(target_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  
  -- Get Annual Leave type ID
  SELECT id INTO annual_leave_type_id 
  FROM leave_types 
  WHERE name = 'Annual Leave' AND is_active = true
  LIMIT 1;
  
  IF annual_leave_type_id IS NULL THEN
    RAISE EXCEPTION 'Annual Leave type not found';
  END IF;
  
  -- Process each active employee
  FOR emp_record IN 
    SELECT e.id, e.full_name, e.joining_date 
    FROM employees e 
    WHERE e.status = 'Active' 
      AND e.joining_date IS NOT NULL
      AND e.joining_date <= make_date(process_year, process_month, 1) + interval '1 month' - interval '1 day'
  LOOP
    -- Check if already processed for this month
    IF EXISTS (
      SELECT 1 FROM leave_accrual_log 
      WHERE leave_accrual_log.employee_id = emp_record.id 
        AND accrual_month = process_month 
        AND accrual_year = process_year
    ) THEN
      employee_id := emp_record.id;
      employee_name := emp_record.full_name;
      joining_date := emp_record.joining_date;
      months_of_service := 0;
      accrual_rate := 0;
      days_accrued := 0;
      new_entitled_days := 0;
      status := 'Already processed';
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    -- Calculate months of service
    emp_months_service := (
      EXTRACT(YEAR FROM make_date(process_year, process_month, 1)) * 12 + 
      EXTRACT(MONTH FROM make_date(process_year, process_month, 1))
    ) - (
      EXTRACT(YEAR FROM emp_record.joining_date) * 12 + 
      EXTRACT(MONTH FROM emp_record.joining_date)
    );
    
    -- Ensure non-negative months
    IF emp_months_service < 0 THEN
      employee_id := emp_record.id;
      employee_name := emp_record.full_name;
      joining_date := emp_record.joining_date;
      months_of_service := emp_months_service;
      accrual_rate := 0;
      days_accrued := 0;
      new_entitled_days := 0;
      status := 'Not yet started';
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    -- Determine accrual rate based on tenure
    -- Up to 6 months (0-5 completed months): 2 days per month
    -- After 6 months (6+ completed months): 2.5 days per month
    IF emp_months_service < 6 THEN
      emp_accrual_rate := 2.0;
    ELSE
      emp_accrual_rate := 2.5;
    END IF;
    
    emp_days_accrued := emp_accrual_rate;
    
    -- Get or create leave balance for current year
    SELECT lb.* INTO balance_record
    FROM leave_balances lb
    WHERE lb.employee_id = emp_record.id
      AND lb.leave_type_id = annual_leave_type_id
      AND lb.year = process_year;
    
    IF balance_record IS NULL THEN
      -- Create new balance record with initial 0 days
      INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days, pending_days, carried_forward_days)
      VALUES (emp_record.id, annual_leave_type_id, process_year, 0, 0, 0, 0)
      RETURNING * INTO balance_record;
    END IF;
    
    -- Calculate new entitled days
    new_balance := balance_record.entitled_days + emp_days_accrued;
    
    -- Update leave balance
    UPDATE leave_balances
    SET entitled_days = new_balance,
        updated_at = now()
    WHERE id = balance_record.id;
    
    -- Log the accrual
    INSERT INTO leave_accrual_log (
      employee_id, leave_balance_id, accrual_date, accrual_month, accrual_year,
      months_of_service, accrual_rate, days_accrued, joining_date
    ) VALUES (
      emp_record.id, balance_record.id, CURRENT_DATE, process_month, process_year,
      emp_months_service, emp_accrual_rate, emp_days_accrued, emp_record.joining_date
    );
    
    -- Return result
    employee_id := emp_record.id;
    employee_name := emp_record.full_name;
    joining_date := emp_record.joining_date;
    months_of_service := emp_months_service;
    accrual_rate := emp_accrual_rate;
    days_accrued := emp_days_accrued;
    new_entitled_days := new_balance;
    status := 'Processed';
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.process_monthly_leave_accrual IS 
'Processes monthly leave accrual for all active employees based on tenure:
- Up to 6 months of service: 2 days per month
- After 6 months of service: 2.5 days per month
Call with specific month/year or defaults to current month.';