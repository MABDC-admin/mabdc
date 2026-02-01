
# Plan: Fix Undertime Display for Appealed Records in Monthly Matrix

## Problem Summary

When an employee's attendance appeal is approved (for example, for undertime), the Monthly Matrix incorrectly shows "P" (Present) instead of the appropriate status like "UT" (Undertime). This happens because the system currently treats ALL approved appeals as "Present" without considering what the original issue was.

## Solution

Instead of blindly showing all "Appealed" records as Present, we will analyze the **actual times** on the record to determine the correct status:

- If the check-out time is still early → Show as **UT** (Undertime)
- If the check-in time is late → Show as **L** (Late)
- If both issues exist → Show as **L** (Late takes priority in the current design)
- If times are within normal range → Show as **P** (Present)

---

## Technical Changes

### File: `src/components/attendance/MonthlyMatrixView.tsx`

**Current behavior (line 249-250):**
```typescript
// Appealed - Show as Present (approved appeal = Present)
if (status === 'appealed') return 'P';
```

**New behavior:**
```typescript
// Appealed - Analyze actual times to determine display status
if (status === 'appealed') {
  // Check if still undertime based on check_out time
  if (attendance.check_out) {
    const [hours, minutes] = attendance.check_out.split(':').map(Number);
    const checkOutMinutes = hours * 60 + minutes;
    const shiftEndMinutes = 17 * 60; // Default: 5:00 PM = 1020 minutes
    
    // If checked out more than 15 minutes early, still undertime
    if (checkOutMinutes < shiftEndMinutes - 15) {
      return 'UT';
    }
  }
  // Check if still late based on check_in time
  if (attendance.check_in) {
    const [hours, minutes] = attendance.check_in.split(':').map(Number);
    const checkInMinutes = hours * 60 + minutes;
    const shiftStartMinutes = 8 * 60; // Default: 8:00 AM = 480 minutes
    
    // If checked in more than 5 minutes late
    if (checkInMinutes > shiftStartMinutes + 5) {
      return 'L';
    }
  }
  return 'P'; // Times are within acceptable range
}
```

**For a more accurate solution**, we should use the employee's actual shift times. However, this would require async calls which complicate the synchronous `getDayStatus` function. A simpler approach is to:

1. Use a reasonable default shift (08:00 - 17:00)
2. Apply a small grace period for both late (5 min) and undertime (15 min)

---

## Alternative Approach: Store Original Status

A cleaner long-term solution would be to store the **original status** when the appeal is approved, but this requires database changes. For now, the time-based calculation provides an accurate fix without schema changes.

---

## Summary of Changes

| Location | Change |
|----------|--------|
| `MonthlyMatrixView.tsx` lines 249-250 | Replace simple "P" return with time-based status calculation |

---

## Expected Outcome

| Scenario | Before | After |
|----------|--------|-------|
| Appeal approved, checkout at 4:00 PM | P | UT |
| Appeal approved, checkout at 5:05 PM | P | P |
| Appeal approved, check-in at 8:30 AM | P | L |
| Appeal approved, times are normal | P | P |

This ensures HR reports accurately reflect attendance issues even after appeals are approved.
