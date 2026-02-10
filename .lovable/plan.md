

# Fix: Tooltip "Invalid Date" and Transparent Background

## Two Bugs to Fix

### Bug 1: "Invalid Date" for Check In / Check Out

**Cause:** The database stores `check_in` and `check_out` as **time-only** strings (e.g., `"07:44:00"`, `"17:31:00"`). The current code does `new Date("07:44:00")` which returns `Invalid Date` in most browsers because it's not a valid date string.

**Fix:** Replace `new Date()` parsing with a simple string-based time formatter that converts `"07:44:00"` to `"07:44 AM"` and `"17:31:00"` to `"05:31 PM"`.

### Bug 2: Tooltip Background Not Visible

**Cause:** The default tooltip uses `bg-popover` which relies on CSS custom properties. In the context of the matrix table, this may not render as fully opaque.

**Fix:** Override the tooltip background with an explicit solid color: `bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg` so it's always clearly visible regardless of theme context.

## File Changed

`src/components/attendance/MonthlyMatrixView.tsx` -- lines 846-888

### Specific Changes

1. **Replace `formatTime12` function** (lines 846-852): Parse the `HH:MM:SS` time string directly instead of using `new Date()`.

```typescript
const formatTime12 = (timeStr: string | null | undefined) => {
  if (!timeStr) return '---';
  const parts = timeStr.substring(0, 5).split(':');
  if (parts.length < 2) return '---';
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return '---';
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display.toString().padStart(2, '0')}:${m} ${period}`;
};
```

2. **Update TooltipContent className** (line 883): Add explicit background and text color classes.

```
className="text-xs leading-relaxed bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-lg"
```

## No Other Files Changed

These are both contained within the same cell-rendering block.
