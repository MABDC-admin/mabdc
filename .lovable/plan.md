
# Fix: Undertime Displaying Incorrectly (Ramadan Shift)

## Root Cause

When employees checked out today (Feb 18), the checkout hook (`useCheckOutByHRMS`) correctly fetched the Ramadan shift overrides via `getEmployeeShiftTimes()`. However, 3 employees have a **stale/wrong `status` in the attendance table** because their checkout time was recorded as "Undertime" against the OLD 17:00 shift end, but then the Ramadan overrides were applied. The stored status was not recomputed after the override was set.

**Affected employees today (Feb 18):**

| Employee | Check-in | Check-out | Stored Status | Correct Status |
|---|---|---|---|---|
| Ashley Scott Dadula | 09:27 | 15:08 | Late \| Undertime | Late (checked out AFTER 15:00) |
| Gema E. Guevara | 07:55 | 15:04 | Undertime | Present (checked out AFTER 15:00) |
| Homer S. Macrohon | 07:55 | 14:51 | Undertime | Undertime ✓ (genuinely before 15:00) |
| Raffa Jade E. Sumindol | 07:49 | 15:05 | Undertime | Present (checked out AFTER 15:00) |

Also, views like **AttendanceView**, **DashboardView**, and **EmployeePortalPreview** display `a.status` directly from the database without re-evaluating against shift overrides — so even future correct checkouts might display the wrong status on those views.

## Two-Part Fix

### Part 1: Database Correction (SQL migration)
Correct the 3 wrong records for today:
- Ashley Scott Dadula → `"Late"` (late check-in, on-time checkout)
- Gema E. Guevara → `"Present"` (on-time check-in and checkout)
- Raffa Jade E. Sumindol → `"Present"` (on-time check-in and checkout)

This is a targeted UPDATE on those specific attendance row IDs.

### Part 2: Fix the Checkout Hook for Future Checkouts

The `useCheckOutByHRMS` hook in `src/hooks/useAttendance.ts` correctly calls `getEmployeeShiftTimes()` which reads shift overrides from the database. This is working correctly for **new** checkouts from today onward — the issue was only for records written before the Ramadan overrides were applied. No code change is needed in the hook.

### Part 3: Fix Status Display on Views that Show Raw `a.status`

The **Time Clock View** and **Monthly Matrix** already use the evaluator correctly and will show the right status after the DB is corrected.

The **AttendanceView** (`src/components/views/AttendanceView.tsx`) and **DashboardView** render the raw `a.status` from the database. After the DB correction in Part 1, these will also show the correct status.

## What Will Change

### Files Modified
- **Database only** (SQL migration): Update 3 attendance rows with corrected status values

### No Frontend Code Changes Needed
The evaluator-based views (Time Clock, Monthly Matrix) already compute correctly. The raw-status views (Attendance, Dashboard) will show correctly once the DB records are fixed.

## Technical Detail

```sql
-- Fix Ashley Scott Dadula: checked out 15:08 (after 15:00), was late in → "Late"
UPDATE attendance SET status = 'Late', modified_by = 'Ramadan Shift Correction', modified_at = now()
WHERE employee_id = 'efd7ee9f-7589-4951-9812-48fc68f506b8' AND date = '2026-02-18';

-- Fix Gema E. Guevara: checked out 15:04 (after 15:00), on-time in → "Present"  
UPDATE attendance SET status = 'Present', modified_by = 'Ramadan Shift Correction', modified_at = now()
WHERE employee_id = '5860bd88-c097-4857-9669-1be825edfb62' AND date = '2026-02-18';

-- Fix Raffa Jade E. Sumindol: checked out 15:05 (after 15:00), on-time in → "Present"
UPDATE attendance SET status = 'Present', modified_by = 'Ramadan Shift Correction', modified_at = now()
WHERE employee_id = 'cf452996-33b2-4886-8895-e321cf71730a' AND date = '2026-02-18';
```

Homer S. Macrohon (checked out at 14:51, before 15:00) is genuinely undertime and his record is left unchanged.
