

# Plan: Add Deduction Reason to Payslip Edit Modal (HR Only)

## Summary

Add a "Deduction Reason" text input field to the payslip edit modal. This reason will be visible to HR for record-keeping purposes but will NOT be shown in the generated payslip PDF sent to employees.

---

## Current State Analysis

| Component | Current Behavior |
|-----------|------------------|
| `payroll` table | Already has `deduction_reason` column |
| Generate Payroll dialog | Already has deduction reason input (lines 757-762) |
| Edit Payroll dialog | **Missing** deduction reason input |
| `useUpdatePayroll` hook | **Does NOT save** deduction_reason |
| Payslip PDF | Shows "Deductions" label only, not the reason |

---

## Changes Overview

| File | Action |
|------|--------|
| `src/components/views/PayrollView.tsx` | Add deduction reason input to edit modal |
| `src/hooks/usePayroll.ts` | Update `useUpdatePayroll` to include deduction_reason |

---

## Detailed Changes

### 1. Update Edit Modal in PayrollView.tsx

**File: `src/components/views/PayrollView.tsx`**

Add a deduction reason input field after the deductions amount field (after line 1106):

```typescript
// After the deductions input and helper text (line 1106-1107)
<div className="border-t border-border pt-4">
  <Label className="text-destructive">Deductions (AED)</Label>
  <Input
    type="number"
    value={editingPayroll.deductions}
    onChange={(e) => setEditingPayroll({...editingPayroll, deductions: Number(e.target.value)})}
    className="border-destructive/30"
  />
  <p className="text-xs text-muted-foreground mt-1">Add absences, loan repayments, or other deductions</p>
  
  {/* NEW: Deduction Reason Input */}
  {editingPayroll.deductions > 0 && (
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
</div>
```

### 2. Update handleEditPayroll Function

**File: `src/components/views/PayrollView.tsx`**

Modify the `handleEditPayroll` function (around line 290-324) to pass the deduction reason:

```typescript
// Current (line 296-304):
await updatePayroll.mutateAsync({
  id: editingPayroll.id,
  basicSalary: editingPayroll.basic_salary,
  housingAllowance: editingPayroll.housing_allowance || 0,
  transportationAllowance: editingPayroll.transportation_allowance || 0,
  ticketAllowance: ticketAmount,
  otherAllowances: editingPayroll.other_allowances || 0,
  deductions: editingPayroll.deductions || 0,
});

// Updated:
await updatePayroll.mutateAsync({
  id: editingPayroll.id,
  basicSalary: editingPayroll.basic_salary,
  housingAllowance: editingPayroll.housing_allowance || 0,
  transportationAllowance: editingPayroll.transportation_allowance || 0,
  ticketAllowance: ticketAmount,
  otherAllowances: editingPayroll.other_allowances || 0,
  deductions: editingPayroll.deductions || 0,
  deductionReason: editingPayroll.deduction_reason || '',  // NEW
});
```

### 3. Update useUpdatePayroll Hook

**File: `src/hooks/usePayroll.ts`**

Modify the `useUpdatePayroll` mutation to accept and save the deduction reason:

```typescript
// Current (lines 222-237):
mutationFn: async ({ 
  id, 
  basicSalary, 
  housingAllowance,
  transportationAllowance,
  ticketAllowance,
  otherAllowances,
  deductions 
}: {
  id: string;
  basicSalary: number;
  housingAllowance: number;
  transportationAllowance: number;
  ticketAllowance: number;
  otherAllowances: number;
  deductions: number;
})

// Updated:
mutationFn: async ({ 
  id, 
  basicSalary, 
  housingAllowance,
  transportationAllowance,
  ticketAllowance,
  otherAllowances,
  deductions,
  deductionReason = ''  // NEW
}: {
  id: string;
  basicSalary: number;
  housingAllowance: number;
  transportationAllowance: number;
  ticketAllowance: number;
  otherAllowances: number;
  deductions: number;
  deductionReason?: string;  // NEW
})
```

Also update the Supabase update call (lines 244-253):

```typescript
// Current:
.update({
  basic_salary: basicSalary,
  housing_allowance: housingAllowance,
  transportation_allowance: transportationAllowance,
  ticket_allowance: ticketAllowance,
  other_allowances: otherAllowances,
  allowances: totalAllowances,
  deductions,
  net_salary: netSalary,
})

// Updated:
.update({
  basic_salary: basicSalary,
  housing_allowance: housingAllowance,
  transportation_allowance: transportationAllowance,
  ticket_allowance: ticketAllowance,
  other_allowances: otherAllowances,
  allowances: totalAllowances,
  deductions,
  deduction_reason: deductionReason,  // NEW
  net_salary: netSalary,
})
```

---

## Payslip PDF Behavior (No Change Required)

The payslip PDF in `src/utils/payrollPdf.ts` already shows only "Deductions" as a label without the detailed reason. The current code (lines 348-356) uses `deduction_reason` only as a fallback label when there are no itemized deductions:

```typescript
// Line 354 - Only shows generic label, not exposed in detail
record.deduction_reason || 'Deductions',
```

This means:
- HR sees the full reason in the admin panel
- Employee payslip shows only "Deductions" with amount (privacy maintained)

---

## UI Preview

### Edit Modal (HR View)

```
┌─────────────────────────────────────────┐
│ Edit Payroll - Add Deductions           │
├─────────────────────────────────────────┤
│ [Employee Info Box]                     │
│                                         │
│ Basic Salary (AED)     Housing (AED)    │
│ [____________]         [____________]   │
│                                         │
│ Transport (AED)        Other (AED)      │
│ [____________]         [____________]   │
│                                         │
│ ─────────────────────────────────────── │
│ Deductions (AED)                        │
│ [____________]                          │
│ Add absences, loan repayments, etc.     │
│                                         │
│ Deduction Reason (HR Reference Only)    │  ← NEW
│ [e.g., 2 days absence, Loan repayment]  │  ← NEW
│ For HR records only - not shown on      │  ← NEW
│ employee payslip                        │  ← NEW
│                                         │
│ [Summary Box with Net Salary]           │
│                                         │
│ [       Save Changes       ]            │
└─────────────────────────────────────────┘
```

---

## Technical Summary

| Change | Location | Description |
|--------|----------|-------------|
| Add input field | PayrollView.tsx (line ~1107) | Deduction reason input (shown only when deductions > 0) |
| Update handler | PayrollView.tsx (line ~296) | Pass `deductionReason` to mutation |
| Update hook | usePayroll.ts (line ~222) | Accept and save `deduction_reason` |
| Payslip PDF | payrollPdf.ts | No change needed - reason already excluded |

