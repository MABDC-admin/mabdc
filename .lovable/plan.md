
# Fix: New Checkouts Still Showing Undertime (Root Cause Found)

## Root Cause

The checkout hooks compute undertime using the browser's `Date` object: `now.getHours()`. If the kiosk device's timezone is set to UTC instead of GST (UTC+4), then at 3:12 PM local time, JavaScript sees it as 11:12 AM — which is before 15:00 — so it incorrectly marks the checkout as "Undertime."

**The fix must stop using `Date.getHours()` for undertime comparison** and instead compare the recorded `checkOutTime` string (which is always displayed in the correct local format "HH:MM") directly against the shift end string — both as simple string/number comparisons. This makes the logic timezone-independent.

The second issue found: `AttendanceScanner.tsx` line 253 hardcodes `scheduledEndTime: '17:00'` for undertime notifications, which would send wrong emails during Ramadan. This also needs to be fixed to use the actual shift end time.

## What Will Change

### File 1: `src/utils/shiftValidation.ts`
**Change `isUndertimeForShift`** to accept either a `Date` or a time string `"HH:MM"`. This makes it work correctly regardless of device timezone.

New signature:
```typescript
export function isUndertimeForShift(
  currentTime: Date | string, 
  shiftEndTime: string
): boolean
```

If `currentTime` is a string (e.g. `"15:12"`), parse it directly. If it is a `Date`, extract hours/minutes using `getHours()`/`getMinutes()` as a fallback. This is backwards-compatible.

### File 2: `src/hooks/useAttendance.ts`
In **`useCheckOutByHRMS`** and **`useCheckOutById`**, replace:
```typescript
const isUndertime = isUndertimeForShift(now, shiftTimes.end);
```
With:
```typescript
const isUndertime = isUndertimeForShift(checkOutTime, shiftTimes.end);
```

`checkOutTime` is already the recorded string like `"15:12"` — this makes undertime detection 100% timezone-safe.

### File 3: `src/pages/AttendanceScanner.tsx`
Fix the hardcoded `scheduledEndTime: '17:00'` in the undertime notification call. After the checkout mutation, the returned `data` object contains `shiftTimes` info — but since it does not currently return `shiftTimes.end`, we need to pass the checkout status correctly.

The simplest fix: only send the undertime notification when the `data.status` actually contains "Undertime" (which after the hook fix will only be true when genuinely early). The scheduled end time should be fetched from the shift override — we will pass the correct `shiftTimes.end` through the checkout hook's return value.

### Database Correction
Once the hook is fixed, **future checkouts will be correct automatically**. For today's already-wrongly-recorded records (Krisha and Myranel, checkout 15:12 both marked Undertime), a targeted SQL update will correct them:

```sql
UPDATE attendance 
SET status = 'Present', 
    modified_by = 'Ramadan Shift Correction', 
    modified_at = now()
WHERE employee_id IN (
  '3093642a-32ae-41f4-aaab-3a3e86aa0748', -- Krisha Dwine R. Riotoc
  '1f583766-2711-4d82-883e-b357d2358df8'  -- Myranel D. Plaza
)
AND date = '2026-02-18';
```

## Summary of Changes

| File | Change |
|------|--------|
| `src/utils/shiftValidation.ts` | `isUndertimeForShift` accepts time string, compares directly without timezone |
| `src/hooks/useAttendance.ts` | Pass `checkOutTime` string instead of `now` Date to `isUndertimeForShift` (both `useCheckOutByHRMS` and `useCheckOutById`) |
| `src/pages/AttendanceScanner.tsx` | Fix hardcoded `'17:00'` scheduledEndTime; use actual shift end from hook return |
| Database | Fix 2 remaining wrong records (Krisha, Myranel) for Feb 18 |

## Why This Fixes It Permanently

After the change, `isUndertimeForShift("15:12", "15:00")` correctly parses both as numbers: `15 === 15 && 12 < 0` → false → not undertime. This works identically on any device timezone.
