

# Plan: Fix Ticket Allowance Records - Restore Unpaid Tickets

## Problem Summary

When I marked historical ticket allowances as "processed", I incorrectly included recent records (2025-2026) that were approved but **never actually paid** (no `processed_in_payroll_id`). This caused employees like Glorie Ann (eligible January 1, 2026) to not show as eligible in payroll.

---

## Affected Records

| Employee | Eligibility Date | Status | Should Be |
|----------|-----------------|--------|-----------|
| Glorie Ann I. Espinosa | 2026-01-01 | processed (no payroll) | approved |
| Marlo T. Abrigo | 2025-12-06 | processed (no payroll) | approved |
| Eulogio E. Dadula | 2025-12-01 | processed (no payroll) | approved |
| Sheila Mae P. Dadula | 2025-12-01 | processed (no payroll) | approved |
| Mark John J. Ramirez | 2025-10-30 | processed (no payroll) | approved |
| Princess Jesa D. Tagulao | 2025-09-07 | processed (no payroll) | approved |
| And many more... | ... | ... | ... |

---

## Root Cause

The SQL I ran earlier incorrectly included records that:
1. Were approved but never processed into payroll
2. Have past eligibility dates (legitimately owed money)
3. Were marked as "processed" without linking to an actual payroll record

---

## Solution

### Step 1: Restore Incorrectly Marked Records

Run SQL to change `status` back to `'approved'` for records that:
- Are currently marked as `'processed'`
- Have no `processed_in_payroll_id` (never actually paid)
- Have notes containing `[Marked as processed - historical record]`

```sql
UPDATE ticket_allowance_records
SET 
  status = 'approved',
  processed_at = NULL,
  notes = REPLACE(notes, ' [Marked as processed - historical record]', ''),
  updated_at = NOW()
WHERE status = 'processed'
  AND processed_in_payroll_id IS NULL
  AND notes LIKE '%[Marked as processed - historical record]%';
```

This will restore the correct state so these employees show as eligible in payroll.

---

## Expected Result

After the fix:
1. **Glorie Ann** (2026-01-01) → Shows as "Ticket Eligible: AED 3,000" in payroll
2. **Marlo** (2025-12-06) → Shows as eligible
3. **All affected employees** → Restored to `approved` status and visible in payroll

---

## Files to Modify

None - this is a data-only fix via SQL.

---

## Verification

After the SQL runs, the payroll view should show the pulsing bell indicator for all employees with approved but unprocessed ticket allowances whose eligibility date has passed.

