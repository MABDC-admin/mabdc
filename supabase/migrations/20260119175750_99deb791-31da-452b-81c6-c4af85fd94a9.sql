-- Function to create notification when leave status changes
CREATE OR REPLACE FUNCTION notify_leave_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to Approved or Rejected
  IF NEW.status != OLD.status AND NEW.status IN ('Approved', 'Rejected') THEN
    INSERT INTO notifications (user_id, title, body, type, data)
    SELECT 
      e.user_id,
      'Leave Request ' || NEW.status,
      'Your ' || NEW.leave_type || ' leave request has been ' || LOWER(NEW.status),
      'leave_' || LOWER(NEW.status),
      jsonb_build_object('leave_id', NEW.id)
    FROM employees e
    WHERE e.id = NEW.employee_id
      AND e.user_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on leave_records table
DROP TRIGGER IF EXISTS leave_status_notification ON leave_records;
CREATE TRIGGER leave_status_notification
AFTER UPDATE ON leave_records
FOR EACH ROW
EXECUTE FUNCTION notify_leave_status_change();