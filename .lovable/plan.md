

# Plan: Remove LOP Warning Notification from Leave Request Modal

## Problem

When an employee selects "Loss of Pay" (LOP) as a leave type, a yellow warning box appears saying the days will be deducted from salary. The user wants this notification removed.

## Current Behavior

The modal displays this warning block when LOP is selected:

> Warning: Loss of Pay Leave
> These X day(s) will be deducted from your salary. LOP is calculated at (Basic Salary / 30) per day.

## Fix

**File:** `src/components/modals/LeaveRequestModal.tsx`

Remove the LOP warning block (approximately lines 217-225):

```typescript
{/* LOP Warning - REMOVE THIS ENTIRE BLOCK */}
{isLOPLeave && requestedDays > 0 && (
  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
    <p className="text-sm font-medium text-amber-600">
      Warning: Loss of Pay Leave
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      These {requestedDays} day(s) will be deducted from your salary...
    </p>
  </div>
)}
```

## Summary

| Item | Detail |
|------|--------|
| File modified | `src/components/modals/LeaveRequestModal.tsx` |
| Change | Delete the LOP warning JSX block (~9 lines) |
| Risk | None -- purely cosmetic removal |

