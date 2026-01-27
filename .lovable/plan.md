

# Plan: Add Database Trigger for Attendance Appeal HR Notifications

## Current Situation

The Leave Request notification now works reliably because we added a **PostgreSQL trigger** that calls the edge function server-side. However, Attendance Appeals still relies only on the frontend code, which can fail due to caching issues.

## Solution: Create Same Database Trigger Pattern for Appeals

We will create an identical trigger pattern on the `attendance_appeals` table to ensure HR receives notifications for new appeals, regardless of frontend state.

---

## Database Migration

Create a new trigger function and attach it to the `attendance_appeals` table:

```sql
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
      'Authorization', 'Bearer ' || '<anon_key>'
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
```

---

## How It Works

```text
Employee Submits Attendance Appeal
         │
         ▼
INSERT INTO attendance_appeals (status = 'Pending')
         │
         ▼
PostgreSQL Trigger Fires (trg_appeal_request_notify_hr)
         │
         ├── Check: Is status 'Pending'? ✓
         ├── Check: Already in email_history? ✗
         │
         ▼
net.http_post() → Edge Function (async)
         │
         ▼
send-appeal-request-notification
         │
         ├── Fetch appeal + employee details
         ├── Send email to HR
         └── Log to email_history
         │
         ▼
HR receives: "📩 New Attendance Appeal: [Employee Name]"
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[timestamp]_appeal_notify_trigger.sql` | Create | Database trigger for appeal notifications |

---

## Benefits

| Feature | Description |
|---------|-------------|
| Server-side execution | Works even if frontend is cached/outdated |
| Duplicate prevention | Checks `email_history` before sending |
| Async processing | Uses `pg_net` for non-blocking HTTP calls |
| Consistent pattern | Same approach as working leave request trigger |

---

## Summary

This migration creates a PostgreSQL trigger that fires immediately after any new attendance appeal is inserted. It will call the `send-appeal-request-notification` edge function server-side, ensuring HR always receives the notification regardless of the employee's browser/app state.

