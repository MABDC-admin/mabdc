

# Add Ramadan Shift Schedule (Feb 18 – Mar 18, 2026)

## Overview

Create temporary shift overrides for all 31 active employees during the Ramadan period. The system already supports per-employee per-date shift overrides, which take highest priority in schedule resolution.

## Schedule Details

| Employees | Start Time | End Time | Period |
|-----------|-----------|---------|--------|
| All except Melanie N. Tangonan | 08:00 AM | 03:00 PM | Feb 18 – Mar 18 |
| Melanie N. Tangonan | 09:00 AM | 04:00 PM | Feb 18 – Mar 18 |

**March 19 onward**: No overrides, so the system automatically falls back to each employee's permanent shift assignment (normal schedule).

## Working Days Covered (Mon–Fri)

- **February**: 18, 19, 20, 23, 24, 25, 26, 27 (8 days)
- **March**: 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18 (13 days)
- **Total**: 21 working days

## Data to Insert

- 30 employees x 21 days = **630 records** (08:00–15:00)
- 1 employee (Mel) x 21 days = **21 records** (09:00–16:00)
- **Total: 651 shift override records** in the `employee_shift_overrides` table
- Reason field set to "Ramadan Shift" for easy identification and future cleanup

## Technical Approach

A single SQL `INSERT` using:
1. A CTE generating the 21 working dates
2. A `CROSS JOIN` with all active employee IDs
3. A `CASE` expression to apply 09:00–16:00 for Mel and 08:00–15:00 for everyone else
4. `ON CONFLICT (employee_id, override_date) DO UPDATE` to safely handle any pre-existing overrides

## Why This Works Automatically

The attendance trigger (`apply_attendance_shift_rules`) and the `getEmployeeShiftTimes()` utility both check `employee_shift_overrides` first. Since overrides exist only for Feb 18–Mar 18, on March 19 the system naturally falls back to each employee's permanent shift — no additional cleanup needed.

