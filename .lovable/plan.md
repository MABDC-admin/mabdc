
# Plan: Fix Deduction Reason Privacy in Payslip PDF

## Summary

The deduction reason feature is already implemented in the payroll edit modal, but there's a privacy issue: the `deduction_reason` is currently shown as a label in the payslip PDF sent to employees. This needs to be fixed to always show a generic "Deductions" label instead.

---

## Current State Analysis

| Component | Status | Issue |
|-----------|--------|-------|
| Edit modal - deduction reason field | Implemented | None |
| Edit button - only for pending payroll | Implemented | None |
| useUpdatePayroll hook | Implemented | None |
| Payslip PDF | Bug | Shows `deduction_reason` as label to employees |

---

## The Problem

In `src/utils/payrollPdf.ts` (line 354):

```typescript
// CURRENT - Exposes deduction reason to employees!
: [[
    record.deduction_reason || 'Deductions',  // ← BUG: Shows reason on payslip
    `-${formatCurrency(record.deductions, currency)}`
  ]];
```

When HR enters a deduction reason like "2 days absence, Loan repayment", this text appears on the employee's payslip - violating privacy requirements.

---

## Solution

Change line 354 to always use a generic "Deductions" label, regardless of whether a reason was entered:

```typescript
// FIXED - Always show generic label
: [[
    'Deductions',  // ← Always generic, reason stays internal
    `-${formatCurrency(record.deductions, currency)}`
  ]];
```

---

## File to Modify

| File | Change |
|------|--------|
| `src/utils/payrollPdf.ts` | Replace `record.deduction_reason \|\| 'Deductions'` with just `'Deductions'` |

---

## Technical Details

### Change in payrollPdf.ts (lines 348-356):

```typescript
// Current:
if (deductions.length > 0 || record.deductions > 0) {
  const deductionsBody: string[][] = deductions.length > 0 
    ? deductions.map(d => [
        d.label + (d.days ? ` (${d.days} day${d.days > 1 ? 's' : ''})` : ''),
        `-${formatCurrency(d.amount, currency)}`
      ])
    : [[
        record.deduction_reason || 'Deductions',  // ← Remove this
        `-${formatCurrency(record.deductions, currency)}`
      ]];

// Fixed:
if (deductions.length > 0 || record.deductions > 0) {
  const deductionsBody: string[][] = deductions.length > 0 
    ? deductions.map(d => [
        d.label + (d.days ? ` (${d.days} day${d.days > 1 ? 's' : ''})` : ''),
        `-${formatCurrency(d.amount, currency)}`
      ])
    : [[
        'Deductions',  // ← Always generic
        `-${formatCurrency(record.deductions, currency)}`
      ]];
```

---

## Privacy Behavior After Fix

| Location | Deduction Reason Visibility |
|----------|----------------------------|
| PayrollView (HR/Admin table) | Visible in tooltip or display |
| Edit Payroll Modal | Visible and editable by HR |
| Employee Payslip PDF | Hidden - shows only "Deductions" |
| Email to Employee | Hidden - PDF attached shows generic label |

---

## Summary

This is a one-line fix that ensures employee privacy by always showing a generic "Deductions" label on payslips, while HR can still see and edit the full reason in the admin panel.
