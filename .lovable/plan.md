
# Plan: Enforce Undertime (UT) Across All Views for Appealed Records

## Problem

Currently, when an appeal is approved, the attendance status is set to a generic "Appealed" in the database. Multiple views then treat "Appealed" as "Present," which masks undertime. The previous fix only addressed the Monthly Matrix view. This fix needs to apply system-wide.

## Root Cause

The real problem is at the **source** -- when an appeal is approved, the code blindly sets `status: 'Appealed'` without evaluating the actual check-in/check-out times. Every downstream view then has to re-interpret what "Appealed" means, and most get it wrong.

## Strategy: Fix at the Source + Fix All Display Views

### Part 1: Fix Appeal Approval Logic (compute real status)

When an appeal is approved, instead of setting `status: 'Appealed'`, compute the correct status based on the final check-in/check-out times (e.g., "Undertime", "Late | Undertime", "Present", "Late"). Append "[Appealed]" to `admin_remarks` so the appeal origin is still tracked.

**Files to modify:**

1. **`src/components/views/AttendanceAppealsView.tsx`** (lines 108-123)
   - After determining final check_in and check_out, compute the real status using shift times
   - Use the existing `getEmployeeShiftTimes`, `isLateForShift`, `isUndertimeForShift` utilities
   - Set computed status instead of hardcoded "Appealed"

2. **`supabase/functions/process-email-approval/index.ts`** (lines 290-310)
   - Same logic: compute real status from final times before saving
   - Query the employee's shift to determine late/undertime

### Part 2: Fix All Display Views That Treat "Appealed" as "Present"

For any remaining "Appealed" records already in the database, fix display logic:

3. **`src/components/views/DashboardView.tsx`** (line 91)
   - Stop counting "Appealed" as "Present" unconditionally
   - Remove `|| a.status === 'Appealed'` from the presentToday filter

4. **`src/components/views/AttendanceView.tsx`** (line 94)
   - Same fix: remove `|| a.status === 'Appealed'` from presentCount

5. **`src/components/attendance/EmployeeAttendanceCalendar.tsx`** (lines 148-171)
   - When status is "appealed", re-evaluate actual times to categorize as present/undertime/late/absent (same logic as MonthlyMatrix)
   - Remove the blanket `present += appealed` at line 171

6. **`src/components/views/TimeClockView.tsx`** (line 201)
   - When status is "Appealed", re-evaluate based on actual check-in/check-out times instead of mapping to generic "appealed" display

7. **`supabase/functions/send-daily-summary/index.ts`** (line 92)
   - Stop counting "Appealed" as "Present" in daily email summaries

8. **`src/components/admin/AdminAttendanceReport.tsx`** (line 120)
   - Stop counting "Appealed" as present days in attendance reports
   - Re-evaluate based on actual times

### Part 3: Helper Function

Create a shared utility function to avoid duplicating the status computation logic:

9. **`src/utils/shiftValidation.ts`** (add new function)
   - Add `computeAttendanceStatus(checkIn, checkOut, shiftStart, shiftEnd): string`
   - Returns: "Present", "Late", "Undertime", "Late | Undertime", "Absent"
   - Reusable by appeal approval, monthly matrix, calendar, time clock, and reports

## Expected Results

| Scenario | Before | After |
|----------|--------|-------|
| Appeal approved, left at 4:30 PM | Status: "Appealed" (shown as Present) | Status: "Undertime" (remarks: [Appeal Approved]) |
| Appeal approved, arrived 8:15 AM, left 5 PM | Status: "Appealed" (shown as Present) | Status: "Late" (remarks: [Appeal Approved]) |
| Appeal approved, full day | Status: "Appealed" (shown as Present) | Status: "Present" (remarks: [Appeal Approved]) |
| Old "Appealed" records in DB | Counted as Present everywhere | Re-evaluated based on actual times in all views |

## Files Summary

| File | Action | Change |
|------|--------|--------|
| `src/utils/shiftValidation.ts` | Modify | Add `computeAttendanceStatus()` helper |
| `src/components/views/AttendanceAppealsView.tsx` | Modify | Compute real status on approval |
| `supabase/functions/process-email-approval/index.ts` | Modify | Compute real status on email approval |
| `src/components/views/DashboardView.tsx` | Modify | Re-evaluate "Appealed" records |
| `src/components/views/AttendanceView.tsx` | Modify | Re-evaluate "Appealed" records |
| `src/components/attendance/EmployeeAttendanceCalendar.tsx` | Modify | Re-evaluate "Appealed" in calendar stats |
| `src/components/views/TimeClockView.tsx` | Modify | Re-evaluate "Appealed" in time clock |
| `supabase/functions/send-daily-summary/index.ts` | Modify | Re-evaluate "Appealed" in email summary |
| `src/components/admin/AdminAttendanceReport.tsx` | Modify | Re-evaluate "Appealed" in reports |

## No Database Changes Required

The existing "Appealed" status value remains valid in the constraint. New records will use computed statuses; old records will be re-evaluated at display time.
