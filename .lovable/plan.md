
# Plan: Fix Payroll Discrepancies and Enhance Payslip Breakdown

## Issues Identified

### Issue 1: Payroll Salary Mismatch with Contracts

**Evidence from Database:**
| Employee | Contract Housing | Contract Transport | Payroll Housing | Payroll Transport | Status |
|----------|-----------------|-------------------|-----------------|-------------------|--------|
| Aimee June A. Alolor | 1,000 | 700 | 0 | 0 | MISMATCH (Dec-2025) |
| Arianne Kaye N. Sager | 1,000 | 700 | 0 | 0 | MISMATCH (Dec-2025) |
| Christine Mari M. Jonson | 800 | 400 | 0 | 0 | MISMATCH (Dec-2025) |
| Dennis P. Sotto | 1,000 | 700 | 0 | 0 | MISMATCH (Dec-2025) |

**Root Cause**: The December 2025 payroll was generated **before** the payroll system was updated to pull itemized allowances from contracts. The older records only have a combined `allowances` field with no breakdown stored.

**January 2026 payroll is CORRECT** - the bulk generate now properly pulls housing and transportation from contracts.

---

### Issue 2: Missing Payroll Earnings Breakdown

**Evidence:**
- December 2025 records have **NO** entries in `payroll_earnings` table
- January 2026 records have **PROPER** itemized earnings (basic_salary, housing_allowance, transport_allowance)

When payslip PDF is generated for December records, the `getEarningsBreakdown()` function falls back to **estimation** (60% housing, 25% transport, 15% other) instead of showing actual breakdown.

---

### Issue 3: Ticket Allowance Not Included in Payroll

**Evidence:**
```
| Employee | Ticket Status | Ticket Amount | Payroll Ticket |
|----------|--------------|---------------|----------------|
| Aimee June A. Alolor | approved | 3,000 | 0 |
| Antonio | approved | 3,000 | 0 |
| Arianne Kaye N. Sager | approved | 3,000 | 0 |
(32+ employees with approved ticket allowance, all showing 0 in payroll)
```

**Root Cause**: 
1. When using "Bulk Generate", ticket allowance is NOT automatically included
2. The `handleBulkGenerate` function (lines 190-234) does not check for approved ticket allowances
3. Only "Single Generate" form shows the ticket allowance option

---

### Issue 4: Payslip Doesn't Show Ticket Allowance Breakdown

Even when ticket allowance IS included, the payslip PDF shows a generic "Ticket Allowance Status" box at the bottom, but doesn't clearly show the amount in the earnings table breakdown if it was part of the payroll.

---

## Solution Overview

### Part 1: Fix Bulk Payroll Generation to Include Ticket Allowance

**File: `src/components/views/PayrollView.tsx`**

Update `handleBulkGenerate()` to check for approved ticket allowances:

```typescript
const handleBulkGenerate = async () => {
  // ...existing code...
  
  for (const emp of employeesWithoutPayroll) {
    const contract = contracts.find(c => c.employee_id === emp.id && c.status === 'Active');
    
    // CHECK FOR APPROVED TICKET ALLOWANCE
    const ticketAllowance = approvedTicketAllowances.find(t => t.employee_id === emp.id);
    const ticketAmount = ticketAllowance?.amount || 0;
    
    const basicSalary = contract?.basic_salary || emp.basic_salary || 0;
    const housingAllowance = contract?.housing_allowance || 0;
    const transportAllowance = contract?.transportation_allowance || 0;
    
    await generatePayroll.mutateAsync({
      employeeId: emp.id,
      month: selectedMonth,
      basicSalary,
      housingAllowance,
      transportationAllowance: transportAllowance,
      ticketAllowance: ticketAmount,  // NOW INCLUDED
      otherAllowances: 0,
      deductions: 0,
      deductionReason: '',
    });
    
    // Mark ticket allowance as processed if included
    if (ticketAllowance && ticketAmount > 0) {
      await processTicketAllowance.mutateAsync({
        id: ticketAllowance.id,
        payrollId: payrollData.id
      });
    }
  }
};
```

---

### Part 2: Show Allowance Breakdown in Payroll List View

**File: `src/components/views/PayrollView.tsx`**

Update the payroll card to show itemized breakdown on hover or expand:

```typescript
<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
  <div>
    <p className="text-[10px] uppercase text-muted-foreground">Basic Salary</p>
    <p className="text-sm font-medium text-foreground">AED {record.basic_salary?.toLocaleString()}</p>
  </div>
  <div>
    <p className="text-[10px] uppercase text-muted-foreground">Allowances</p>
    <div className="group relative">
      <p className="text-sm font-medium text-primary">+{record.allowances?.toLocaleString()}</p>
      {/* Breakdown Tooltip */}
      <div className="absolute z-10 hidden group-hover:block bg-popover border rounded-lg p-2 shadow-lg text-xs w-48 top-full left-0">
        <p className="flex justify-between"><span>Housing:</span> <span>AED {record.housing_allowance?.toLocaleString() || 0}</span></p>
        <p className="flex justify-between"><span>Transport:</span> <span>AED {record.transportation_allowance?.toLocaleString() || 0}</span></p>
        {record.ticket_allowance > 0 && (
          <p className="flex justify-between text-blue-500"><span>Ticket:</span> <span>AED {record.ticket_allowance?.toLocaleString()}</span></p>
        )}
        {record.other_allowances > 0 && (
          <p className="flex justify-between"><span>Other:</span> <span>AED {record.other_allowances?.toLocaleString()}</span></p>
        )}
      </div>
    </div>
  </div>
  {/* ...rest of grid... */}
</div>
```

---

### Part 3: Improve Payslip PDF Earnings Breakdown

**File: `src/utils/payrollPdf.ts`**

The `getEarningsBreakdown()` function already handles itemized earnings correctly. However, when no `payroll_earnings` records exist, it estimates. 

Update to always use the stored breakdown fields first:

```typescript
function getEarningsBreakdown(record: PayrollRecord): Array<{ label: string; amount: number }> {
  // PRIORITY 1: Use itemized earnings from database if available
  if (record.payroll_earnings && record.payroll_earnings.length > 0) {
    return record.payroll_earnings.map(e => ({
      label: formatEarningLabel(e.earning_type),
      amount: e.amount
    }));
  }
  
  // PRIORITY 2: Use stored breakdown fields (housing_allowance, transportation_allowance, etc.)
  const earnings: Array<{ label: string; amount: number }> = [];
  
  if (record.basic_salary > 0) {
    earnings.push({ label: 'Basic Salary', amount: record.basic_salary });
  }
  
  // Check for itemized allowance fields
  const hasItemizedAllowances = (record.housing_allowance && record.housing_allowance > 0) ||
                                 (record.transportation_allowance && record.transportation_allowance > 0) ||
                                 (record.ticket_allowance && record.ticket_allowance > 0);
  
  if (hasItemizedAllowances) {
    if (record.housing_allowance > 0) {
      earnings.push({ label: 'Housing Rental Allowance', amount: record.housing_allowance });
    }
    if (record.transportation_allowance > 0) {
      earnings.push({ label: 'Transportation Allowance', amount: record.transportation_allowance });
    }
    if (record.ticket_allowance > 0) {
      earnings.push({ label: 'Ticket Allowance (Annual)', amount: record.ticket_allowance });
    }
    if (record.other_allowances > 0) {
      earnings.push({ label: 'Other Allowances', amount: record.other_allowances });
    }
    return earnings;
  }
  
  // PRIORITY 3: Fallback - estimate from total allowances (for legacy records)
  if (record.allowances > 0) {
    earnings.push({ label: 'Allowances (Combined)', amount: record.allowances });
  }
  
  return earnings;
}
```

---

### Part 4: Add Data Repair for Legacy Payroll Records

Create a repair function to backfill `housing_allowance` and `transportation_allowance` for December 2025 records based on contract data:

**SQL Migration or Manual Query:**
```sql
-- Repair December 2025 payroll records with missing itemized allowances
UPDATE payroll p
SET 
  housing_allowance = c.housing_allowance,
  transportation_allowance = c.transportation_allowance
FROM contracts c
WHERE p.employee_id = c.employee_id
  AND c.status = 'Active'
  AND p.month = '2025-12'
  AND (p.housing_allowance IS NULL OR p.housing_allowance = 0)
  AND (p.transportation_allowance IS NULL OR p.transportation_allowance = 0);

-- Also insert missing payroll_earnings records for December
INSERT INTO payroll_earnings (payroll_id, earning_type, description, amount)
SELECT p.id, 'basic_salary', 'Basic Salary', p.basic_salary
FROM payroll p
WHERE p.month = '2025-12'
  AND NOT EXISTS (
    SELECT 1 FROM payroll_earnings pe 
    WHERE pe.payroll_id = p.id AND pe.earning_type = 'basic_salary'
  );

INSERT INTO payroll_earnings (payroll_id, earning_type, description, amount)
SELECT p.id, 'housing_allowance', 'Housing Rental Allowance', p.housing_allowance
FROM payroll p
WHERE p.month = '2025-12'
  AND p.housing_allowance > 0
  AND NOT EXISTS (
    SELECT 1 FROM payroll_earnings pe 
    WHERE pe.payroll_id = p.id AND pe.earning_type = 'housing_allowance'
  );

INSERT INTO payroll_earnings (payroll_id, earning_type, description, amount)
SELECT p.id, 'transport_allowance', 'Transportation Allowance', p.transportation_allowance
FROM payroll p
WHERE p.month = '2025-12'
  AND p.transportation_allowance > 0
  AND NOT EXISTS (
    SELECT 1 FROM payroll_earnings pe 
    WHERE pe.payroll_id = p.id AND pe.earning_type = 'transport_allowance'
  );
```

---

### Part 5: Add Ticket Allowance Badge to Payroll Cards

Show which payroll records include ticket allowance:

```typescript
{record.ticket_allowance > 0 && (
  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/30 flex items-center gap-1">
    <Plane className="w-3 h-3" /> Ticket +{record.ticket_allowance?.toLocaleString()}
  </span>
)}
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/views/PayrollView.tsx` | MODIFY | Add ticket allowance to bulk generate, show allowance breakdown tooltip, add ticket badge |
| `src/utils/payrollPdf.ts` | MODIFY | Improve earnings breakdown priority logic |
| `src/hooks/usePayroll.ts` | MODIFY | Return ticket allowance processing mutation for bulk operations |

---

## Data Fix Required

Run these SQL statements to repair December 2025 payroll records:

1. Update payroll table with correct housing/transport values from contracts
2. Insert missing payroll_earnings records for itemized breakdown
3. Verify January 2026 records are correct (already confirmed they are)

---

## Summary of Changes

| Issue | Solution |
|-------|----------|
| Bulk generate doesn't include ticket allowance | Update `handleBulkGenerate` to check `approvedTicketAllowances` |
| Payroll list only shows total allowances | Add hover tooltip with itemized breakdown |
| Payslip PDF estimates allowances | Prioritize stored fields before estimation |
| Legacy records missing breakdown | SQL repair to backfill from contracts |
| No visual indicator for ticket in payroll | Add blue "Ticket" badge when amount > 0 |

---

## Technical Notes

- The January 2026 payroll generation is already working correctly
- The issue is primarily with legacy December 2025 records
- The payslip PDF already has logic to show itemized earnings, but it falls back to estimation when no data exists
- Ticket allowance is approved (32 records) but not being included in bulk payroll generation
