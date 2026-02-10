

# Plan: Updated Attendance Status Rules

## Changes Required

### 1. `src/utils/attendanceEvaluator.ts` -- Core Logic Updates

**A. Spring Break as Non-Working Day**
Currently, Spring Break is only detected via `leaveType`. The new rule says SB overrides everything (like a weekend) -- no MP/A/L/UT should appear on SB days. This already works correctly because leave is checked first (priority 1), and SB is mapped from a leave type containing "spring". No change needed here since SB comes from approved leave records.

**B. Appeal + Undertime Rule (CRITICAL FIX)**
Current code at lines 140-151 converts MP to P when appeal is approved, without checking for undertime. The new rule states:
- MP with approved appeal converts to P **only if there is NO undertime**
- If employee has undertime (check_out < shift_end), the status MUST remain UT regardless of appeal

Changes to the missed punch section (lines 140-151):
```
// When missing punch out and appeal approved:
// Check if there would be undertime based on available data
// - Missing punch OUT: we have check_in but no check_out → can't determine UT, so convert to P
// - Missing punch IN: we have check_out but no check_in → check if check_out < shift_end
if (appealStatus === 'approved') {
  if (isMissingPunchIn && checkOutMin !== null && checkOutMin < shiftEndMin) {
    // Has undertime — UT takes priority, appeal cannot override
    flags.undertime = true;
    flags.present = true;
    return result('UT');
  }
  flags.present = true;
  return result('P');
}
```

**C. Both punches present + undertime + appeal approved**
Current code at lines 170-191 does not check appeal status for the both-punches-present case. The new rules say UT is absolute and appeal cannot convert it to P. Since the current code already returns UT/L+UT/L without checking appeal status for the both-punches case, this is already correct. No change needed.

### 2. `src/components/attendance/MonthlyMatrixView.tsx` -- No Changes

The Matrix already delegates to the evaluator. Once the evaluator is fixed, the Matrix will automatically show the correct codes.

### 3. `src/components/views/TimeClockView.tsx` -- No Changes

Time Clock also delegates to the evaluator and maps flags to badges. No changes needed.

## Summary of Code Changes

| File | Change |
|------|--------|
| `src/utils/attendanceEvaluator.ts` | Update lines 140-151: when appeal is approved and missing punch IN, check if check_out < shift_end before converting MP to P. If undertime exists, return UT instead of P. |

## What This Fixes

| Scenario | Before | After |
|----------|--------|-------|
| check_in=08:00, check_out=null, appeal=approved | P | P (correct -- no UT data available) |
| check_in=null, check_out=16:59, appeal=approved | P | UT (undertime detected from check_out) |
| check_in=08:00, check_out=16:59, no appeal | UT | UT (unchanged, already correct) |
| check_in=08:00, check_out=16:59, appeal=approved | UT | UT (unchanged, UT is absolute) |
| SB leave day with attendance record | SB | SB (unchanged, leave priority already handles this) |

## No Database Changes Required

All changes are computation logic only.
