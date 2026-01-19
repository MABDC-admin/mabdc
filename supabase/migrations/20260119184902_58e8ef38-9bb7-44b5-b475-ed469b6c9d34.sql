-- Fix notification type check constraint and trigger function

-- Step 1: Drop the existing constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Step 2: Add updated constraint with all needed types
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'leave_approval'::text, 
  'leave_rejection'::text, 
  'attendance_reminder'::text, 
  'announcement'::text, 
  'document_expiry'::text, 
  'general'::text,
  'attendance_appeal'::text
]));

-- Step 3: Fix the leave notification function to use correct type names
CREATE OR REPLACE FUNCTION public.notify_leave_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_user_id UUID;
  v_employee_name TEXT;
  v_notification_type TEXT;
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('Approved', 'Rejected') THEN
    SELECT e.user_id, e.full_name
    INTO v_employee_user_id, v_employee_name
    FROM public.employees e
    WHERE e.id = NEW.employee_id;
    
    IF v_employee_user_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Use correct type names that match the constraint
    IF NEW.status = 'Approved' THEN
      v_notification_type := 'leave_approval';
    ELSE
      v_notification_type := 'leave_rejection';
    END IF;
    
    INSERT INTO public.notifications (user_id, title, body, type, data, read, sent_at)
    VALUES (
      v_employee_user_id,
      CASE WHEN NEW.status = 'Approved' 
           THEN 'Leave Request Approved ✅' 
           ELSE 'Leave Request Rejected ❌' END,
      'Your ' || NEW.leave_type || ' leave from ' || 
      TO_CHAR(NEW.start_date, 'DD Mon YYYY') || ' to ' || 
      TO_CHAR(NEW.end_date, 'DD Mon YYYY') || ' has been ' || 
      LOWER(NEW.status) || COALESCE('. Reason: ' || NEW.rejection_reason, ''),
      v_notification_type,
      jsonb_build_object(
        'leave_id', NEW.id,
        'leave_type', NEW.leave_type,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'days_count', NEW.days_count,
        'status', NEW.status
      ),
      false,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;