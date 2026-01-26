

# Plan: Insert Present Records for January 9, 2026

## Current State

| Metric | Value |
|--------|-------|
| Active employees | 31 |
| Employees on leave Jan 9 | 2 (Antonio, Reanne) |
| Existing attendance records | 1 (Renz Vincent - Appealed) |
| Missing "Present" records | 28 |

## Employees on Leave (Exclusions)

| Employee | Leave Type | Period |
|----------|------------|--------|
| Antonio | Annual Leave | Dec 1, 2025 - Feb 28, 2026 |
| Reanne Kristley I. Guevara | Maternity Leave | Jan 5 - Mar 5, 2026 |

## SQL to Execute

```sql
INSERT INTO attendance (employee_id, date, check_in, check_out, status, admin_remarks, modified_by, modified_at)
SELECT 
  e.id as employee_id,
  '2026-01-09'::date as date,
  COALESCE(
    CASE WHEN es.shift_type = 'afternoon' THEN '09:00'::time ELSE '08:00'::time END,
    '08:00'::time
  ) as check_in,
  COALESCE(
    CASE WHEN es.shift_type = 'afternoon' THEN '18:00'::time ELSE '17:00'::time END,
    '17:00'::time
  ) as check_out,
  'Present' as status,
  'Bulk entry - Jan 9, 2026 Friday' as admin_remarks,
  'System Admin' as modified_by,
  NOW() as modified_at
FROM employees e
LEFT JOIN employee_shifts es ON es.employee_id = e.id
WHERE e.status = 'Active'
  -- Exclude employees on approved leave
  AND NOT EXISTS (
    SELECT 1 FROM leave_records lr
    WHERE lr.employee_id = e.id
      AND lr.status = 'Approved'
      AND lr.start_date <= '2026-01-09'
      AND lr.end_date >= '2026-01-09'
  )
  -- Avoid duplicate entries (Renz already has a record)
  AND NOT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.employee_id = e.id
      AND a.date = '2026-01-09'
  );
```

## Expected Results

| Outcome | Count |
|---------|-------|
| New "Present" records inserted | 28 |
| Skipped (on leave) | 2 |
| Skipped (already exists) | 1 |
| **Total after insert** | 29 records for Jan 9 |

## Files to Modify

None - this is a **data-only operation** via SQL.

