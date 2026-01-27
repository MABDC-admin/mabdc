-- Trigger function: after an appeal is inserted, enqueue HTTP call to notification function
CREATE OR REPLACE FUNCTION public.trigger_appeal_request_notify_hr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify HR for newly submitted appeals with 'Pending' status
  IF NEW.status IS DISTINCT FROM 'Pending' THEN
    RETURN NEW;
  END IF;

  -- Prevent duplicates if the frontend already sent it
  IF EXISTS (
    SELECT 1
    FROM public.email_history eh
    WHERE eh.email_type = 'appeal_request'
      AND (eh.metadata->>'appeal_id') = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  -- Enqueue async HTTP request (pg_net)
  PERFORM net.http_post(
    url := 'https://fwdtjszxnnfqxjevlasm.supabase.co/functions/v1/send-appeal-request-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3ZHRqc3p4bm5mcXhqZXZsYXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTk1OTcsImV4cCI6MjA4MDY3NTU5N30.kHCuIZ-EzTqE6ALc5XRa9gyH-D1AG4RN2VlvPJWNJws'
    ),
    body := jsonb_build_object('appeal_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

-- Create trigger on attendance_appeals table
DROP TRIGGER IF EXISTS trg_appeal_request_notify_hr ON public.attendance_appeals;
CREATE TRIGGER trg_appeal_request_notify_hr
AFTER INSERT ON public.attendance_appeals
FOR EACH ROW
EXECUTE FUNCTION public.trigger_appeal_request_notify_hr();