
# Plan: Automatic Absent Notification Email After Shift Ends

## Summary

Create an automated system that sends an email to HR (`myranelsotto@gmail.com`) after shifts end, listing all employees who didn't check in for the day. This will help HR immediately know who is absent without manually checking the Time Clock view.

---

## Architecture Overview

```text
+-------------------+       +------------------------+       +-------------------+
|   Cron Job        |       | send-absent-           |       |  HR Email         |
|   (6:30 PM UAE)   | ----> | notification           | ----> |  (myranelsotto@   |
|                   |       | Edge Function          |       |   gmail.com)      |
+-------------------+       +------------------------+       +-------------------+
                                     |
                                     v
                            +------------------+
                            | Database Queries |
                            | - employees      |
                            | - attendance     |
                            | - employee_shifts|
                            +------------------+
```

---

## Implementation Details

### 1. Create New Edge Function: `send-absent-notification`

**File:** `supabase/functions/send-absent-notification/index.ts`

This function will:
1. Get today's date (UAE timezone)
2. Fetch all active employees with their assigned shifts
3. For each employee, determine their shift end time:
   - Check for shift override on this date
   - Fall back to permanent shift assignment
   - Default to morning shift (17:00 end)
4. Query attendance records for today
5. Identify employees who have no check-in record (absent)
6. Send email to HR with the absent employees list using Resend API

**Logic for determining absence:**
```typescript
// Employee is absent if:
// - No attendance record for today, OR
// - Has attendance record but no check_in time

// The email should be triggered AFTER the latest shift ends (18:00 for afternoon shift)
```

### 2. Update `supabase/config.toml`

Add function configuration:

```toml
[functions.send-absent-notification]
verify_jwt = false
```

### 3. Set Up Cron Job

Schedule the function to run daily at 18:30 UAE time (after the latest shift ends at 18:00):

**SQL to execute (via Supabase SQL tool):**

```sql
select cron.schedule(
  'send-absent-notification-daily',
  '30 14 * * 1-6', -- 14:30 UTC = 18:30 UAE time (Mon-Sat)
  $$
  select net.http_post(
    url:='https://fwdtjszxnnfqxjevlasm.supabase.co/functions/v1/send-absent-notification',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3ZHRqc3p4bm5mcXhqZXZsYXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTk1OTcsImV4cCI6MjA4MDY3NTU5N30.kHCuIZ-EzTqE6ALc5XRa9gyH-D1AG4RN2VlvPJWNJws"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

---

## Email Template Design

**Subject:** `Absent Employees Report - {Date} | {Count} Employee(s) Absent`

**Email Content:**

| Header | Absent Employees Report |
|--------|------------------------|
| Date | Today's date |
| Total Absent | Count |

**Table of Absent Employees:**

| Employee Name | HRMS No | Department | Position | Assigned Shift |
|--------------|---------|------------|----------|----------------|
| John Doe | 001 | IT | Developer | Morning (08:00-17:00) |
| Jane Smith | 002 | HR | Manager | Afternoon (09:00-18:00) |

---

## Edge Function Code Structure

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

// 1. Get today's date (UAE timezone)
// 2. Fetch all active employees with shift assignments
// 3. Fetch today's attendance records
// 4. Identify employees with no check-in
// 5. Generate HTML email with absent employees table
// 6. Send email to HR via Resend
```

---

## HR Email Configuration

The email will be sent to:
- **Primary:** `myranelsotto@gmail.com`
- **Fallback:** Uses existing `HR_NOTIFICATION_EMAIL` secret as backup

---

## Shift Timing Logic

| Shift Type | Start Time | End Time |
|------------|-----------|----------|
| Morning | 08:00 | 17:00 |
| Afternoon | 09:00 | 18:00 |
| Flexible | Custom per override | Custom per override |
| Default | 08:00 | 17:00 |

**Cron runs at 18:30** to ensure all shifts have ended before sending the report.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/send-absent-notification/index.ts` | Create | New edge function for absent notifications |
| `supabase/config.toml` | Modify | Add function configuration |

---

## Additional SQL to Execute

```sql
-- Schedule the cron job to run Monday-Saturday at 18:30 UAE time
SELECT cron.schedule(
  'send-absent-notification-daily',
  '30 14 * * 1-6',
  $$
  SELECT net.http_post(
    url:='https://fwdtjszxnnfqxjevlasm.supabase.co/functions/v1/send-absent-notification',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer {anon_key}"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

---

## Email Behavior

- **No absences:** Email will still be sent with a success message "All employees checked in today!"
- **Absences found:** Email contains detailed table of absent employees with their shift assignments
- **Excludes:** Employees on approved leave, holidays, or weekend (handled by checking only weekdays in cron)

---

## Summary

| Component | Description |
|-----------|-------------|
| Edge Function | `send-absent-notification` - Identifies and reports absent employees |
| Trigger | Daily cron job at 18:30 UAE time (Mon-Sat) |
| Recipient | `myranelsotto@gmail.com` |
| Email Service | Resend API (existing integration) |
| Shift Awareness | Checks shift assignments and overrides for accurate timing |
