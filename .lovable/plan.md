

# Fix: Glorie Ann Feb 4 Status Discrepancy

## Root Cause

The evaluator code is already correct and will display `MP` in the Monthly Matrix. The real issue is:

1. **The DB `status` column is still `Present`** even though `check_out` is NULL -- this was set by the check-in process and never corrected
2. Other views or reports that read the raw DB `status` column (not the evaluator) will still show "Present"

## What Needs to Be Done

### Step 1: Fix the DB record

Update Glorie Ann's Feb 4 attendance record to have the correct computed status:

```sql
UPDATE attendance 
SET status = 'Miss Punch Out'
WHERE id = '508d81b3-9fa9-49e9-82a4-a949709b0f6d';
```

### Step 2: Scan for ALL similar records

Find every attendance record where `check_in` exists but `check_out` is NULL and `status = 'Present'` -- these are all incorrectly labeled:

```sql
SELECT id, employee_id, date, check_in, check_out, status
FROM attendance
WHERE check_in IS NOT NULL 
  AND check_out IS NULL 
  AND status = 'Present';
```

Then bulk-update all of them to `Miss Punch Out`.

### Step 3: Also scan reverse (check_out exists, check_in NULL)

```sql
SELECT id, employee_id, date, check_in, check_out, status
FROM attendance
WHERE check_in IS NULL 
  AND check_out IS NOT NULL 
  AND status = 'Present';
```

Update these to `Miss Punch In`.

### No Code Changes Needed

The unified evaluator already handles this correctly at display time. The DB fix ensures consistency for any view or export that reads the raw `status` column.

## Summary

| Item | Detail |
|------|--------|
| Root cause | DB status says "Present" but check_out is NULL |
| Evaluator behavior | Already correct -- returns MP |
| DB fix | Update all miss-punch records with wrong status |
| Code changes | None |

