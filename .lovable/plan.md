
# Plan: Make Deduction Reason Field Always Visible

## Summary

Remove the conditional check that hides the "Deduction Reason" field when deductions is 0. This will make the field always visible in the Edit Payroll modal, allowing HR to document reasons even before entering a deduction amount.

---

## Current Behavior

The Deduction Reason field is **hidden** until the user enters a deduction amount greater than 0.

```typescript
{(editingPayroll.deductions || 0) > 0 && (
  <div className="mt-3">
    <Label>Deduction Reason (HR Reference Only)</Label>
    ...
  </div>
)}
```

## New Behavior

The Deduction Reason field will **always be visible** in the edit modal, regardless of the deduction amount.

---

## File to Modify

**`src/components/views/PayrollView.tsx`** - Lines 1109-1122

### Change

Remove the conditional wrapper `{(editingPayroll.deductions || 0) > 0 && (...)}` so the field is always shown:

```typescript
// BEFORE (lines 1108-1122):
<p className="text-xs text-muted-foreground mt-1">Add absences, loan repayments, or other deductions</p>

{(editingPayroll.deductions || 0) > 0 && (
  <div className="mt-3">
    <Label>Deduction Reason (HR Reference Only)</Label>
    <Input
      value={editingPayroll.deduction_reason || ''}
      onChange={(e) => setEditingPayroll({...editingPayroll, deduction_reason: e.target.value})}
      placeholder="e.g., 2 days absence, Loan repayment"
      className="mt-1"
    />
    <p className="text-xs text-muted-foreground mt-1">
      For HR records only - not shown on employee payslip
    </p>
  </div>
)}

// AFTER:
<p className="text-xs text-muted-foreground mt-1">Add absences, loan repayments, or other deductions</p>

<div className="mt-3">
  <Label>Deduction Reason (HR Reference Only)</Label>
  <Input
    value={editingPayroll.deduction_reason || ''}
    onChange={(e) => setEditingPayroll({...editingPayroll, deduction_reason: e.target.value})}
    placeholder="e.g., 2 days absence, Loan repayment"
    className="mt-1"
  />
  <p className="text-xs text-muted-foreground mt-1">
    For HR records only - not shown on employee payslip
  </p>
</div>
```

---

## Impact

| Location | Behavior |
|----------|----------|
| Edit Payroll Modal | Deduction Reason always visible for HR |
| Employee Payslip PDF | Still shows generic "Deductions" label (privacy maintained) |
| Future Payrolls | Same consistent behavior |

---

## Technical Summary

| Change | Location | Description |
|--------|----------|-------------|
| Remove conditional | PayrollView.tsx (line 1109) | Remove `{(editingPayroll.deductions \|\| 0) > 0 && (...)}` wrapper |
