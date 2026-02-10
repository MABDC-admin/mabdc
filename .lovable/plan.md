

# Plan: Add Hover Info (Check-in/Check-out) to Monthly Matrix

## What Changes

Add a tooltip to each day cell in the Monthly Matrix that shows the employee's check-in and check-out times when hovering.

## Single File Change: `src/components/attendance/MonthlyMatrixView.tsx`

### 1. Add Tooltip imports (line 7 area)

Import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip`.

### 2. Wrap the matrix table with `<TooltipProvider>`

Wrap the `<table>` element (around line 781) with `<TooltipProvider delayDuration={200}>`.

### 3. Update cell rendering (lines 836-852)

For each day cell, look up the attendance record to get `check_in` and `check_out`. Wrap the status badge in a `Tooltip` that displays:

- **Check In:** 07:44 AM (or "---" if missing)
- **Check Out:** 05:02 PM (or "---" if missing)
- **Status:** Present / Late / etc.
- **Shift:** 08:00 - 17:00

Only show the tooltip for working days that have data (skip weekends, holidays, future dates, etc.).

### Technical Details

- Use the existing `getAttendanceForEmployeeDay()` helper (line 228) to fetch the record
- Use `resolveShiftTimes()` to show the assigned shift in the tooltip
- Format times as 12-hour (e.g., "08:01 AM") for readability
- Non-working day codes (W, PH, SB, WB, `-`) will show a simpler tooltip or no tooltip
- The tooltip uses the existing shadcn Tooltip component already in the project

