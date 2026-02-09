
# Plan: Mark Appealed Records with No Check-In/Out as Absent

## Problem

Arianne's January 29 record:
- Status: **Appealed**
- check_in: **NULL**
- check_out: **NULL**
- She did not report to duty at all

Currently the Monthly Matrix shows this as **UT** (Undertime), but it should show **A** (Absent) since she never checked in or out.

## Root Cause

In `MonthlyMatrixView.tsx` lines 261-264, when an Appealed record has no `check_out`, the code defaults to `'UT'` without checking whether `check_in` also exists. If both are missing, the employee simply didn't show up -- that's Absent, not Undertime.

## Fix

**File:** `src/components/attendance/MonthlyMatrixView.tsx`

Update the `else` branch (lines 261-264) to distinguish between:
- **No check_out but HAS check_in** --> UT (they came but left without punching out)
- **No check_in AND no check_out** --> A (Absent -- never showed up)

```typescript
} else {
  // No check_out time
  if (!attendance.check_in || attendance.check_in.trim() === '') {
    // No check_in either - employee never showed up, mark Absent
    return 'A';
  }
  // Has check_in but no check_out - missed punch out, show as UT
  return 'UT';
}
```

## Expected Results

| Employee | Date | check_in | check_out | Status | Before | After |
|----------|------|----------|-----------|--------|--------|-------|
| Arianne | Jan 29 | NULL | NULL | Appealed | UT | **A** |
| Arianne | Jan 30 | 07:49 | 12:01 | Undertime | UT | UT (unchanged) |
| Any employee | Any | 08:00 | NULL | Appealed | UT | UT (unchanged) |

## Summary

| Item | Detail |
|------|--------|
| Files to modify | `src/components/attendance/MonthlyMatrixView.tsx` (1 block, ~4 lines) |
| Logic change | Appealed + no check_in + no check_out = Absent |
| Risk | None -- only affects the specific edge case of appealed records with zero punches |
