

# Plan: Undertime Must Stay UT Even After Appeal

## Problem

When an employee's attendance is marked as "Appealed," the Monthly Matrix re-evaluates the actual check-in/check-out times. If the times appear within the normal range (e.g., the appeal corrected times to look acceptable), the code returns "P" (Present) at line 277.

The business rule is: **Undertime must always show as UT, regardless of whether an appeal was filed.** An appeal does not erase the undertime — it only acknowledges the reason.

## Current Logic (Appealed status, lines 250-277)

```
Appealed record?
  -> Has check_out AND left early? -> UT (correct)
  -> No check_out? -> UT (but should be A if no check_in either)
  -> Late check_in? -> L
  -> Otherwise? -> P   <-- PROBLEM: masks undertime
```

## Two Fixes Needed

### Fix 1: No check_in AND no check_out = Absent (from previous approved plan)

Lines 261-264: When both check_in and check_out are missing, the employee never showed up. Mark as **A** (Absent), not UT.

```
Before: No check_out -> always UT
After:  No check_out + no check_in -> A (Absent)
        No check_out + has check_in -> UT (missed punch out)
```

### Fix 2: Check undertime AFTER late check (the main fix)

Line 277 currently returns 'P' as the fallback. This misses the case where:
- check_out exists and is within range (e.g., 16:50 which is within 15 min of 17:00)
- BUT the original issue was undertime

Since the status is "Appealed" and we already checked for early departure at line 252-259, the only way we reach line 277 is if check_out is within the acceptable window. However, the admin_remarks field often contains the original reason (e.g., "Doctor appointment", "miss punch").

The safest approach: also check if admin_remarks contains undertime-related keywords, OR keep the check_out threshold evaluation but with a stricter boundary. But the simplest and most correct fix based on the user's rule is:

**For Appealed records, if check_out is before shift end time (17:00) at all (not just 15 min early), mark as UT.** The 15-minute grace period should not apply to appealed records — the appeal itself is the acknowledgment.

Updated logic:
```
Appealed record?
  -> No check_out + no check_in -> A (Absent)
  -> No check_out + has check_in -> UT (missed punch out)
  -> Has check_out AND check_out < 17:00 -> UT (undertime, no grace for appeals)
  -> Has check_in AND check_in > 08:05 -> L (late)
  -> Otherwise -> P (genuinely on time and full day)
```

## File Change

**File:** `src/components/attendance/MonthlyMatrixView.tsx` (lines 250-277)

Replace the Appealed block with:

```typescript
if (status === 'appealed') {
  if (attendance.check_out && attendance.check_out.trim() !== '') {
    const [hours, minutes] = attendance.check_out.split(':').map(Number);
    const checkOutMinutes = hours * 60 + minutes;
    const shiftEndMinutes = 17 * 60; // 5:00 PM

    // For appealed records: any check_out before shift end = UT (no grace period)
    if (checkOutMinutes < shiftEndMinutes) {
      return 'UT';
    }
  } else {
    // No check_out
    if (!attendance.check_in || attendance.check_in.trim() === '') {
      return 'A'; // No check_in either = Absent
    }
    return 'UT'; // Has check_in but no check_out = missed punch out
  }

  // Check late
  if (attendance.check_in) {
    const [hours, minutes] = attendance.check_in.split(':').map(Number);
    const checkInMinutes = hours * 60 + minutes;
    const shiftStartMinutes = 8 * 60;
    if (checkInMinutes > shiftStartMinutes + 5) {
      return 'L';
    }
  }

  return 'P'; // Full day, on time
}
```

## Expected Results

| Scenario | check_in | check_out | Before | After |
|----------|----------|-----------|--------|-------|
| No show, appealed | NULL | NULL | UT | **A** |
| Came in, no punch out | 07:59 | NULL | UT | **UT** |
| Left at noon (doctor) | 07:59 | 12:00 | UT | **UT** |
| Left at 4:50 PM (was within grace) | 08:00 | 16:50 | **P** | **UT** |
| Full day, on time | 07:30 | 17:00 | P | P |
| Full day, late | 08:10 | 17:00 | L | L |

## Summary

| Item | Detail |
|------|--------|
| Files modified | `src/components/attendance/MonthlyMatrixView.tsx` (1 block, ~20 lines) |
| Key change | Remove 15-min grace period for Appealed records; any departure before 17:00 = UT |
| Also fixes | No check_in + no check_out = Absent (from earlier approved plan) |
| Risk | Low -- only affects Appealed records display in the matrix |

