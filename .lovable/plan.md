

# Plan: Remove Undertime Toast Notification on Check-Out

## Summary

Remove the "(Undertime)" text from the check-out success toast notification. The undertime status will still be recorded in the database, but the toast will simply show "checked out successfully" without mentioning undertime.

---

## Current Behavior

When an employee checks out before their shift end time, the toast shows:
```
"John Doe checked out successfully (Undertime)"
```

## New Behavior

The toast will show:
```
"John Doe checked out successfully"
```

---

## File to Modify

**`src/hooks/useAttendance.ts`** - Lines 341-345

### Current Code (lines 341-345):
```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['attendance'] });
  const undertimeText = data.status?.includes('Undertime') ? ' (Undertime)' : '';
  toast.success(`${data.employeeName} checked out successfully${undertimeText}`);
},
```

### New Code:
```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['attendance'] });
  toast.success(`${data.employeeName} checked out successfully`);
},
```

---

## Impact

| Aspect | Change |
|--------|--------|
| Toast notification | Undertime text removed |
| Database status | Still records "Undertime" or "Late \| Undertime" correctly |
| Time Clock view | Still displays undertime status properly |
| Payroll calculations | Unaffected - undertime still tracked |

---

## Technical Summary

| Change | Location | Description |
|--------|----------|-------------|
| Remove undertime text | useAttendance.ts (line 343-344) | Remove the conditional undertime text from toast |

