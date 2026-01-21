-- Drop existing functions first to avoid return type conflict
DROP FUNCTION IF EXISTS public.process_monthly_leave_accrual(integer, integer);
DROP FUNCTION IF EXISTS public.calculate_tenure_based_leave(date);

-- Recreate process_monthly_leave_accrual with flat 2.5 days/month rate
CREATE OR REPLACE FUNCTION public.process_monthly_leave_accrual(target_month integer DEFAULT NULL, target_year integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  processing_month integer;
  processing_year integer;
  annual_leave_type_id uuid;
  emp record;
  emp_joining_date date;
  emp_months_service integer;
  emp_accrual_rate numeric;
  emp_days_accrued numeric;
  emp_balance_id uuid;
  emp_current_entitled numeric;
  already_processed boolean;
  results jsonb := '[]'::jsonb;
  processed_count integer := 0;
  already_processed_count integer := 0;
  not_started_count integer := 0;
  total_employees integer := 0;
BEGIN
  processing_month := COALESCE(target_month, EXTRACT(MONTH FROM CURRENT_DATE)::integer);
  processing_year := COALESCE(target_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  
  SELECT id INTO annual_leave_type_id
  FROM leave_types
  WHERE code = 'ANNUAL' OR name ILIKE '%annual%'
  LIMIT 1;
  
  IF annual_leave_type_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Annual Leave type not found'
    );
  END IF;
  
  FOR emp IN 
    SELECT id, full_name, joining_date 
    FROM employees 
    WHERE status = 'Active' AND joining_date IS NOT NULL
  LOOP
    total_employees := total_employees + 1;
    emp_joining_date := emp.joining_date;
    
    SELECT EXISTS(
      SELECT 1 FROM leave_accrual_log
      WHERE employee_id = emp.id
        AND accrual_month = processing_month
        AND accrual_year = processing_year
    ) INTO already_processed;
    
    IF already_processed THEN
      already_processed_count := already_processed_count + 1;
      results := results || jsonb_build_object(
        'employee_id', emp.id,
        'employee_name', emp.full_name,
        'status', 'already_processed'
      );
      CONTINUE;
    END IF;
    
    IF emp_joining_date > (DATE_TRUNC('month', make_date(processing_year, processing_month, 1)) + INTERVAL '1 month - 1 day')::date THEN
      not_started_count := not_started_count + 1;
      results := results || jsonb_build_object(
        'employee_id', emp.id,
        'employee_name', emp.full_name,
        'status', 'not_started'
      );
      CONTINUE;
    END IF;
    
    emp_months_service := (processing_year * 12 + processing_month) - 
                          (EXTRACT(YEAR FROM emp_joining_date)::integer * 12 + EXTRACT(MONTH FROM emp_joining_date)::integer);
    
    IF emp_months_service < 0 THEN
      emp_months_service := 0;
    END IF;
    
    -- Flat rate: 2.5 days/month from joining date
    emp_accrual_rate := 2.5;
    emp_days_accrued := emp_accrual_rate;
    
    SELECT id, entitled_days INTO emp_balance_id, emp_current_entitled
    FROM leave_balances
    WHERE employee_id = emp.id
      AND leave_type_id = annual_leave_type_id
      AND year = processing_year;
    
    IF emp_balance_id IS NULL THEN
      INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days, pending_days, carried_forward_days)
      VALUES (emp.id, annual_leave_type_id, processing_year, emp_days_accrued, 0, 0, 0)
      RETURNING id INTO emp_balance_id;
      emp_current_entitled := emp_days_accrued;
    ELSE
      UPDATE leave_balances
      SET entitled_days = entitled_days + emp_days_accrued,
          updated_at = NOW()
      WHERE id = emp_balance_id;
      emp_current_entitled := emp_current_entitled + emp_days_accrued;
    END IF;
    
    INSERT INTO leave_accrual_log (
      employee_id, leave_balance_id, accrual_date, accrual_month, accrual_year,
      months_of_service, accrual_rate, days_accrued, joining_date
    ) VALUES (
      emp.id, emp_balance_id, CURRENT_DATE, processing_month, processing_year,
      emp_months_service, emp_accrual_rate, emp_days_accrued, emp_joining_date
    );
    
    processed_count := processed_count + 1;
    results := results || jsonb_build_object(
      'employee_id', emp.id,
      'employee_name', emp.full_name,
      'joining_date', emp_joining_date,
      'months_of_service', emp_months_service,
      'accrual_rate', emp_accrual_rate,
      'days_accrued', emp_days_accrued,
      'new_entitled_days', emp_current_entitled,
      'status', 'processed'
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'month', processing_month,
    'year', processing_year,
    'total_employees', total_employees,
    'processed_count', processed_count,
    'already_processed_count', already_processed_count,
    'not_started_count', not_started_count,
    'results', results
  );
END;
$function$;

-- Recreate calculate_tenure_based_leave with flat 2.5 days/month rate
CREATE OR REPLACE FUNCTION public.calculate_tenure_based_leave(emp_joining_date date)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  total_months integer;
  accrued_days numeric;
BEGIN
  total_months := (EXTRACT(YEAR FROM CURRENT_DATE)::integer * 12 + EXTRACT(MONTH FROM CURRENT_DATE)::integer) -
                  (EXTRACT(YEAR FROM emp_joining_date)::integer * 12 + EXTRACT(MONTH FROM emp_joining_date)::integer);
  
  IF total_months <= 0 THEN
    RETURN 0;
  END IF;
  
  -- Flat rate: 2.5 days/month from joining date
  accrued_days := total_months * 2.5;
  
  RETURN accrued_days;
END;
$function$;