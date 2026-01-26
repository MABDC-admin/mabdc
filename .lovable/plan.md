

# Plan: Reset Payroll System and Fix Bulk Generation

## Current Issues Identified

Based on database analysis:

| Issue | Details |
|-------|---------|
| **Discrepancy #1: `other_allowances` duplication** | Bulk generate uses `emp.allowance` (line 211) which adds 1700 AED to some employees on TOP of housing/transport from contracts |
| **Discrepancy #2: Ticket auto-included** | Lines 205-206: Ticket allowance is automatically included for ALL employees with approved ticket - user wants this OPTIONAL |
| **Discrepancy #3: Inconsistent totals** | Some have 4700, some 6400, some 1200 - due to mixing of sources |
| **Email History to Clean** | 9 payslip emails sent that need clearing |
| **Payroll Records to Delete** | 31 payroll records + 61 earnings entries |

### Evidence from Database:
```
Arianne Kaye N. Sager: AED 6400 total (housing 1000 + transport 700 + ticket 3000 + other 1700)
Aimee June A. Alolor: AED 4700 total (housing 1000 + transport 700 + ticket 3000 + other 0)
```

The `other_allowances: 1700` comes from `emp.allowance` field which is a legacy/fallback field that should NOT be used when contract values exist.

---

## Solution: Reset and Fix

### Step 1: Delete All Payroll Data (Clean Slate)

Execute SQL to delete all payroll-related data:

```sql
-- Delete payroll earnings first (foreign key)
DELETE FROM payroll_earnings;

-- Delete payroll deductions  
DELETE FROM payroll_deductions;

-- Delete all payroll records
DELETE FROM payroll;

-- Clear email history for payslips
DELETE FROM email_history WHERE email_type = 'payslip';
```

### Step 2: Fix Bulk Generate Logic

**File: `src/components/views/PayrollView.tsx`**

**Problem in current code (lines 201-224):**
```typescript
const ticketAllowance = approvedTicketAllowances.find(...);
const ticketAmount = ticketAllowance?.amount || 0;  // AUTO INCLUDED!
const otherAllowances = emp.allowance || 0;  // DUPLICATES CONTRACT VALUES!

await generatePayroll.mutateAsync({
  ticketAllowance: ticketAmount,  // Always includes ticket
  otherAllowances,  // Adds legacy field on top
});
```

**Fixed logic:**
```typescript
const handleBulkGenerate = async () => {
  // ... existing checks ...
  
  for (const emp of employeesWithoutPayroll) {
    const contract = contracts.find(c => c.employee_id === emp.id && c.status === 'Active');
    
    const basicSalary = contract?.basic_salary || emp.basic_salary || 0;
    const housingAllowance = contract?.housing_allowance || 0;
    const transportAllowance = contract?.transportation_allowance || 0;
    
    // FIX: Only use other_allowances if NO contract exists (fallback only)
    const otherAllowances = contract ? 0 : (emp.allowance || 0);
    
    // FIX: Ticket allowance only if checkbox is checked (optional)
    const ticketAmount = includeTicketInBulk 
      ? (approvedTicketAllowances.find(t => t.employee_id === emp.id)?.amount || 0) 
      : 0;

    await generatePayroll.mutateAsync({
      employeeId: emp.id,
      month: selectedMonth,
      basicSalary,
      housingAllowance,
      transportationAllowance: transportAllowance,
      ticketAllowance: ticketAmount,
      otherAllowances,
      deductions: 0,
      deductionReason: '',
    });
  }
};
```

### Step 3: Add Optional Ticket Allowance Checkbox to Bulk Generate Dialog

Add state for the checkbox:
```typescript
const [includeTicketInBulk, setIncludeTicketInBulk] = useState(false);
```

Add UI in the Bulk Generate Dialog (after the employee list, before the Note):
```typescript
{/* Optional: Include Ticket Allowance */}
{approvedTicketAllowances.length > 0 && (
  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
    <Checkbox 
      id="includeTicket"
      checked={includeTicketInBulk}
      onCheckedChange={(checked) => setIncludeTicketInBulk(!!checked)}
    />
    <label htmlFor="includeTicket" className="flex-1 text-sm cursor-pointer">
      <div className="flex items-center gap-2">
        <Plane className="w-4 h-4 text-blue-500" />
        <span className="font-medium">Include Ticket Allowance</span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        {approvedTicketAllowances.filter(t => 
          employeesWithoutPayroll.some(e => e.id === t.employee_id)
        ).length} employees eligible for ticket allowance this month
      </p>
    </label>
  </div>
)}
```

---

## Files to Modify

| File | Action |
|------|--------|
| `src/components/views/PayrollView.tsx` | Add checkbox state, fix bulk generate logic, add checkbox UI |

---

## Summary of Changes

| Issue | Fix |
|-------|-----|
| `other_allowances` duplication | Only use `emp.allowance` as fallback when NO contract exists |
| Ticket auto-included | Add checkbox `includeTicketInBulk` - default OFF |
| Messy data | Delete all payroll + earnings + deductions + email history |

---

## Post-Implementation Steps

After code changes are deployed:

1. **Delete existing data** via SQL (payroll, payroll_earnings, payroll_deductions, email_history for payslips)
2. **Re-generate payroll** using the fixed bulk generator
3. **Verify** allowance breakdown shows correct values (only housing + transport from contract)
4. **Optionally** include ticket allowance when needed by checking the box

---

## Expected Result After Fix

For an employee with contract:
- Basic: 1,800
- Housing: 1,000
- Transport: 700
- **Total Allowances: 1,700** (NOT 6,400)
- **Net: 3,500** (correct)

Ticket allowance only added if HR explicitly checks the option.

