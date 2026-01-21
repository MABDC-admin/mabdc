-- Ensure kiosk checkout status follows shift rules server-side (end time inclusive)

CREATE OR REPLACE FUNCTION public.apply_attendance_shift_rules()
RETURNS TRIGGER AS $$
DECLARE
  shift_start TIME;
  shift_end TIME;
  shift_type TEXT;
  is_late BOOLEAN;
  is_undertime BOOLEAN;
  base_status TEXT;
BEGIN
  -- Skip automatic recalculation for manually edited records
  IF NEW.modified_by IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Determine effective shift times (Override -> Assignment -> Default)
  SELECT o.shift_start_time, o.shift_end_time
    INTO shift_start, shift_end
  FROM public.employee_shift_overrides o
  WHERE o.employee_id = NEW.employee_id
    AND o.override_date = NEW.date
  LIMIT 1;

  IF shift_end IS NULL THEN
    SELECT es.shift_type
      INTO shift_type
    FROM public.employee_shifts es
    WHERE es.employee_id = NEW.employee_id
    LIMIT 1;

    -- Shift Rules
    -- 1st Shift: 08:00-17:00
    -- 2nd/PM:    09:00-18:00
    IF shift_type = 'afternoon' THEN
      shift_start := '09:00'::time;
      shift_end := '18:00'::time;
    ELSE
      shift_start := '08:00'::time;
      shift_end := '17:00'::time;
    END IF;
  END IF;

  -- Only auto-manage punch-related statuses (avoid overriding leave codes, etc.)
  IF NEW.status IS NOT NULL THEN
    IF NEW.status NOT IN (
      'Present',
      'Late',
      'Undertime',
      'Late | Undertime',
      'Miss Punch In',
      'Miss Punch In | Undertime'
    )
    AND NEW.status NOT ILIKE '%undertime%'
    AND NEW.status NOT ILIKE 'miss punch%'
    THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Base status from check-in
  IF NEW.check_in IS NULL AND NEW.check_out IS NOT NULL THEN
    base_status := 'Miss Punch In';
    is_late := FALSE;
  ELSIF NEW.check_in IS NOT NULL THEN
    -- End time inclusive: Late if check_in strictly after shift start
    is_late := NEW.check_in > shift_start;
    base_status := CASE WHEN is_late THEN 'Late' ELSE 'Present' END;
  ELSE
    RETURN NEW;
  END IF;

  -- End time inclusive: Undertime if check_out strictly before shift end
  IF NEW.check_out IS NOT NULL THEN
    is_undertime := NEW.check_out < shift_end;
  ELSE
    is_undertime := FALSE;
  END IF;

  -- Compose final status
  IF is_undertime THEN
    IF base_status = 'Late' THEN
      NEW.status := 'Late | Undertime';
    ELSIF base_status = 'Present' THEN
      NEW.status := 'Undertime';
    ELSE
      NEW.status := base_status || ' | Undertime';
    END IF;
  ELSE
    NEW.status := base_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS attendance_apply_shift_rules ON public.attendance;

CREATE TRIGGER attendance_apply_shift_rules
BEFORE INSERT OR UPDATE OF check_in, check_out, status, modified_by
ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.apply_attendance_shift_rules();

-- Recalculate today's punch-based statuses (fix existing wrong 'Undertime')
UPDATE public.attendance a
SET status = a.status
WHERE a.date = current_date
  AND a.modified_by IS NULL
  AND a.check_out IS NOT NULL
  AND (a.status ILIKE '%undertime%' OR a.status ILIKE 'miss punch%');