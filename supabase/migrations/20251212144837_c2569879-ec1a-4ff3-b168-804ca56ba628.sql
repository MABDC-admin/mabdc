-- Create function to sync contract salary to employee profile
CREATE OR REPLACE FUNCTION public.sync_contract_salary_to_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync when status changes to 'Active'
  IF NEW.status = 'Active' AND (OLD.status IS NULL OR OLD.status <> 'Active') THEN
    UPDATE employees
    SET 
      basic_salary = NEW.basic_salary,
      allowance = COALESCE(NEW.housing_allowance, 0) + COALESCE(NEW.transportation_allowance, 0),
      updated_at = now()
    WHERE id = NEW.employee_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to fire when contract is updated
CREATE TRIGGER sync_contract_salary_on_activate
  AFTER INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_contract_salary_to_employee();

-- Also create trigger to auto-compute total_salary on insert/update
CREATE OR REPLACE FUNCTION public.compute_contract_total_salary()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.total_salary = NEW.basic_salary + COALESCE(NEW.housing_allowance, 0) + COALESCE(NEW.transportation_allowance, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER compute_total_salary_on_contract
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_contract_total_salary();