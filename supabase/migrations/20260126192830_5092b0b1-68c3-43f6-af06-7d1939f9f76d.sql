-- Ensure HR is always notified for NEW leave requests, even if an employee device is running an outdated cached app.

-- Trigger function: after a leave record is inserted, enqueue an HTTP call to the notification function.
CREATE OR REPLACE FUNCTION public.trigger_leave_request_notify_hr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify HR for newly submitted requests
  IF NEW.status IS DISTINCT FROM 'Pending' THEN
    RETURN NEW;
  END IF;

  -- Prevent duplicates if the frontend (or another system) already sent it
  IF EXISTS (
    SELECT 1
    FROM public.email_history eh
    WHERE eh.email_type = 'leave_request'
      AND (eh.metadata->>'leave_id') = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  -- Enqueue async HTTP request (pg_net)
  PERFORM net.http_post(
    url := 'https://fwdtjszxnnfqxjevlasm.supabase.co/functions/v1/send-leave-request-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3ZHRqc3p4bm5mcXhqZXZsYXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTk1OTcsImV4cCI6MjA4MDY3NTU5N30.kHCuIZ-EzTqE6ALc5XRa9gyH-D1AG4RN2VlvPJWNJws'
    ),
    body := jsonb_build_object('leave_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

-- Recreate trigger idempotently
DROP TRIGGER IF EXISTS trg_leave_request_notify_hr ON public.leave_records;
CREATE TRIGGER trg_leave_request_notify_hr
AFTER INSERT ON public.leave_records
FOR EACH ROW
EXECUTE FUNCTION public.trigger_leave_request_notify_hr();
