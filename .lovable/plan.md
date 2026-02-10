

# Plan: Unified Attendance Status Logic for Monthly Matrix and Time Clock

## Current Problems

1. **Monthly Matrix uses hardcoded 08:00-17:00** -- ignores Morning/Afternoon/Flexible shift assignments and per-day overrides
2. **"Late | Undertime" masked as just "L"** -- undertime hidden when combined with late
3. **5-minute grace period inconsistency** -- Matrix has a grace period for appealed records, Time Clock has zero grace
4. **No Missed Punch appeal awareness** -- Matrix does not check appeal status for MP records
5. **Appealed status still in code paths** -- even though DB records were corrected, the "appealed" branch in `getDayStatus` still uses hardcoded shifts

## Resolution: Unified `evaluateAttendanceDay()` Function

### New Shared Evaluator (`src/utils/attendanceEvaluator.ts`)

Create a single function that both the Monthly Matrix and Time Clock can use. This replaces the inline `getDayStatus` logic in the Matrix and aligns it with Time Clock behavior.

```
evaluateAttendanceDay(params) returns:
  primaryCode: 'P' | 'A' | 'L' | 'UT' | 'L+UT' | 'MP' | 'W' | 'PH' | '-' | leaveCode
  flags: {
    late_entry: boolean
    undertime: boolean
    miss_punch_in: boolean
    miss_punch_out: boolean
    absent: boolean
    present: boolean
  }
  appealStatus: 'none' | 'pending' | 'approved' | 'rejected'
```

### Priority Order (same for both views)

1. Manual Override (Matrix-only feature)
2. Approved Leave (SL, VL, M, SB, WB, LOP, DO)
3. Weekend (W)
4. Public Holiday (PH)
5. Future Date (-)
6. Before system start date (-)
7. No attendance record = Absent (A)
8. Has record -- evaluate punch data against **employee-specific shift times**:
   - No check-in AND no check-out = Absent (A)
   - Missing punch (one side only):
     - If appeal approved: convert to Present (P)
     - If no appeal / pending / rejected: Missed Punch (MP)
   - Late + Undertime = L+UT (new combined code, not masked)
   - Undertime only = UT
   - Late only = L
   - Full shift = Present (P)

### Key Behavior Differences From ChatGPT Suggestion

| Topic | ChatGPT Suggestion | My Resolution |
|-------|-------------------|---------------|
| Appeal MP to P | Only MP to P | Same -- MP with approved appeal becomes P |
| Shift awareness | Not mentioned | Use per-employee shifts (Morning/Afternoon/Flexible + overrides) |
| Late + Undertime | Not addressed | New "L+UT" combined code instead of masking |
| Grace period | Not mentioned | Zero grace -- strict shift boundary evaluation |
| Where logic lives | Generic `evaluateAttendanceDay` | Same approach -- shared utility function |
| Flags returned | Included in return | Same -- return flags for Time Clock granularity |

### Missed Punch + Appeal Conversion Logic (matching ChatGPT)

The Matrix currently does NOT query appeal status. We will:
1. Fetch `attendance_appeals` data in the Matrix view
2. When a record has MP status, check if there is an approved appeal for that employee+date
3. If approved appeal exists: primaryCode = P
4. If no appeal / pending / rejected: primaryCode = MP

## Files to Modify

| File | Change |
|------|--------|
| `src/utils/attendanceEvaluator.ts` | **New file** -- shared `evaluateAttendanceDay()` function |
| `src/components/attendance/MonthlyMatrixView.tsx` | Replace `getDayStatus` with the new evaluator; fetch shifts + overrides + appeals data; add L+UT status config |
| `src/components/views/TimeClockView.tsx` | Minor -- use shared evaluator for consistency (Time Clock keeps its multi-badge display using the `flags` from the evaluator) |
| `src/utils/shiftValidation.ts` | No changes -- `computeAttendanceStatus` remains for appeal approval writes |

## Detailed Changes

### 1. New file: `src/utils/attendanceEvaluator.ts`

- Accepts: checkIn, checkOut, shiftStart, shiftEnd, dbStatus, appealStatus, isWeekend, isHoliday, leaveType, isFuture, isBeforeSystemStart
- Returns: `{ primaryCode, flags, appealStatus }`
- Zero grace period
- Uses employee-specific shift boundaries (passed in as params)

### 2. MonthlyMatrixView.tsx

- Add imports: `useTimeShifts`, `useShiftOverrides` (for selected month), and fetch `attendance_appeals`
- Add new STATUS_CONFIG entry: `'L+UT': { label: 'L+UT', name: 'Late + Undertime', bg: 'bg-amber-500', text: 'text-white' }`
- Replace the entire `getDayStatus` function body to call the shared evaluator
- For each employee+day, look up their shift (override > permanent > default 08:00-17:00)
- For MP records, check appeal status from the appeals query

### 3. TimeClockView.tsx

- Import shared evaluator
- Use `evaluateAttendanceDay()` to get `flags`, then map flags to the existing `TimeClockStatus[]` array for badge display
- Removes duplication between `calculateStatus` and `dbStatusToTimeClock`

## New Legend Item

Add to the Matrix legend:
- L+UT = Late + Undertime (amber-500 background, distinguishable from L which is amber-400)

## No Database Changes Required

All changes are display/computation logic only.

