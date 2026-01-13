-- Create function to calculate total accrued leave from joining date
CREATE OR REPLACE FUNCTION public.calculate_tenure_based_leave(
  p_joining_date DATE,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  total_months INTEGER;
  accrued_days NUMERIC(6,2);
BEGIN
  IF p_joining_date IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate total months of service
  total_months := (EXTRACT(YEAR FROM p_as_of_date) * 12 + EXTRACT(MONTH FROM p_as_of_date)) - 
                  (EXTRACT(YEAR FROM p_joining_date) * 12 + EXTRACT(MONTH FROM p_joining_date));
  
  IF total_months <= 0 THEN
    RETURN 0;
  END IF;
  
  -- Calculate accrued days:
  -- First 6 months: 2 days/month
  -- After 6 months: 2.5 days/month
  IF total_months <= 6 THEN
    accrued_days := total_months * 2;
  ELSE
    accrued_days := (6 * 2) + ((total_months - 6) * 2.5);
  END IF;
  
  RETURN accrued_days;
END;
$$;

-- Update all existing leave balances with tenure-based calculation
UPDATE leave_balances lb
SET entitled_days = public.calculate_tenure_based_leave(e.joining_date),
    updated_at = now()
FROM employees e
WHERE lb.employee_id = e.id
  AND lb.leave_type_id = (SELECT id FROM leave_types WHERE name = 'Annual Leave' LIMIT 1)
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  AND e.joining_date IS NOT NULL;