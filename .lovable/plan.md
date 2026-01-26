

# Plan: Add Ticket Allowance Eligibility Indicator & Edit Checkbox

## Overview

After generating employee payroll, the system will scan for ticket allowance eligibility and display a **pulsing animated bell** for employees who have an approved ticket allowance that hasn't been included in their payroll yet. Additionally, the **Edit dialog** will include a checkbox to add/remove ticket allowance from the current employee's payroll.

---

## Current State Analysis

### Payroll Record Display (Lines 756-860):
- Shows employee info, salary breakdown, and action buttons
- Already has a **Ticket Allowance Badge** that appears when `record.ticket_allowance > 0`
- No indicator for employees who are *eligible* but haven't had ticket allowance added yet

### Edit Dialog (Lines 963-1025):
- Only allows editing: Basic Salary, Allowances (total), Deductions
- No granular control over ticket allowance
- Uses `useUpdatePayroll` which only updates `basic_salary`, `allowances`, `deductions`, `net_salary`

### Data Available:
- `approvedTicketAllowances` - List of approved (but not processed) ticket allowances
- Each payroll record has `ticket_allowance` field

---

## Implementation Plan

### Part 1: Pulsing Bell Indicator for Eligible Employees

**File: `src/components/views/PayrollView.tsx`**

Create a lookup map to identify employees with approved ticket allowances who don't have it in their current payroll:

```typescript
// Create eligibility lookup - employees with approved ticket allowance NOT yet in payroll
const ticketEligibilityMap = useMemo(() => {
  const map = new Map<string, { amount: number; recordId: string }>();
  
  approvedTicketAllowances.forEach(ticket => {
    // Find the payroll record for this employee in current month
    const payrollRecord = filteredPayroll.find(p => p.employee_id === ticket.employee_id);
    
    // If payroll exists but no ticket allowance included, mark as eligible
    if (payrollRecord && (payrollRecord.ticket_allowance || 0) === 0) {
      map.set(ticket.employee_id, {
        amount: ticket.amount || 0,
        recordId: ticket.id
      });
    }
  });
  
  return map;
}, [approvedTicketAllowances, filteredPayroll]);
```

Add the pulsing bell indicator in the payroll record display (after the employee name/badges area):

```typescript
{/* Ticket Allowance Eligibility Indicator - Pulsing Bell */}
{ticketEligibilityMap.has(record.employee_id) && (
  <div className="flex items-center gap-1.5 ml-2 animate-pulse">
    <Bell className="w-4 h-4 text-amber-500" />
    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
      Ticket Eligible: AED {ticketEligibilityMap.get(record.employee_id)?.amount.toLocaleString()}
    </span>
  </div>
)}
```

**Import Bell icon:**
```typescript
import { Bell } from 'lucide-react';
```

### Part 2: Ticket Allowance Checkbox in Edit Dialog

**Step 2a: Update Edit Dialog State**

When opening the edit dialog, also track ticket eligibility:

```typescript
const [editTicketIncluded, setEditTicketIncluded] = useState(false);
const [editTicketAmount, setEditTicketAmount] = useState(0);
```

When opening the edit dialog:
```typescript
onClick={() => {
  const ticketEligible = ticketEligibilityMap.get(record.employee_id);
  const hasTicketAlready = (record.ticket_allowance || 0) > 0;
  
  setEditingPayroll({
    ...record,
    housing_allowance: record.housing_allowance || 0,
    transportation_allowance: record.transportation_allowance || 0,
    ticket_allowance: record.ticket_allowance || 0,
    other_allowances: record.other_allowances || 0,
  });
  setEditTicketIncluded(hasTicketAlready);
  setEditTicketAmount(hasTicketAlready ? record.ticket_allowance : ticketEligible?.amount || 0);
  setIsEditOpen(true);
}}
```

**Step 2b: Update Edit Dialog UI**

Add a checkbox for ticket allowance:

```typescript
{/* Ticket Allowance Option */}
{(ticketEligibilityMap.has(editingPayroll.employee_id) || (editingPayroll.ticket_allowance || 0) > 0) && (
  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
    <Checkbox 
      id="editTicketAllowance"
      checked={editTicketIncluded}
      onCheckedChange={(checked) => setEditTicketIncluded(!!checked)}
    />
    <label htmlFor="editTicketAllowance" className="flex-1 text-sm cursor-pointer">
      <div className="flex items-center gap-2">
        <Plane className="w-4 h-4 text-blue-500" />
        <span className="font-medium">Include Ticket Allowance</span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        Add AED {editTicketAmount.toLocaleString()} for biennial ticket allowance
      </p>
    </label>
  </div>
)}
```

**Step 2c: Update useUpdatePayroll Hook**

Modify the hook to accept individual allowance fields:

```typescript
export function useUpdatePayroll() {
  const queryClient = useQueryClient();
  
  return useMutation({
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
    }) => {
      const totalAllowances = housingAllowance + transportationAllowance + ticketAllowance + otherAllowances;
      const netSalary = basicSalary + totalAllowances - deductions;
      
      const { data, error } = await supabase
        .from('payroll')
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
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    // ... rest of hook
  });
}
```

**Step 2d: Update handleEditPayroll Function**

```typescript
const handleEditPayroll = async () => {
  if (!editingPayroll) return;
  
  const ticketAmount = editTicketIncluded ? editTicketAmount : 0;
  
  try {
    await updatePayroll.mutateAsync({
      id: editingPayroll.id,
      basicSalary: editingPayroll.basic_salary,
      housingAllowance: editingPayroll.housing_allowance || 0,
      transportationAllowance: editingPayroll.transportation_allowance || 0,
      ticketAllowance: ticketAmount,
      otherAllowances: editingPayroll.other_allowances || 0,
      deductions: editingPayroll.deductions || 0,
    });
    
    // If ticket was included, mark the ticket allowance record as processed
    if (editTicketIncluded && ticketEligibilityMap.has(editingPayroll.employee_id)) {
      const ticketRecord = ticketEligibilityMap.get(editingPayroll.employee_id);
      if (ticketRecord) {
        await processTicketAllowance.mutateAsync({
          id: ticketRecord.recordId,
          payrollId: editingPayroll.id
        });
      }
    }
    
    setIsEditOpen(false);
    setEditingPayroll(null);
  } catch (error) {
    console.error('Failed to update payroll:', error);
  }
};
```

---

## Visual Design

### Pulsing Bell Indicator:
```
┌────────────────────────────────────────────────────────────┐
│ [Photo] John Doe                                           │
│         HRMS001 • Software Engineer                        │
│         [Paid] [Emailed]  🔔 Ticket Eligible: AED 3,000   │
│                           ↑ pulsing animation              │
└────────────────────────────────────────────────────────────┘
```

### Edit Dialog with Checkbox:
```
┌────────────────────────────────────────────────────────────┐
│ Edit Payroll - Add Deductions                              │
├────────────────────────────────────────────────────────────┤
│ John Doe                                                   │
│ HRMS001 • Engineering                                      │
├────────────────────────────────────────────────────────────┤
│ Basic Salary: [1,800]    Housing: [1,000]                  │
│ Transport:    [700]      Other:   [0]                      │
├────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐  │
│ │ ☑ Include Ticket Allowance                      ✈️   │  │
│ │   Add AED 3,000 for biennial ticket allowance        │  │
│ └──────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│ Deductions: [0]                                            │
├────────────────────────────────────────────────────────────┤
│ Gross Salary: AED 6,500                                    │
│ Deductions:   -AED 0                                       │
│ ─────────────────────────────────────                      │
│ Net Salary:   AED 6,500                                    │
├────────────────────────────────────────────────────────────┤
│ [Save Changes]                                             │
└────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/views/PayrollView.tsx` | Add ticketEligibilityMap, pulsing bell indicator, edit dialog checkbox, update states |
| `src/hooks/usePayroll.ts` | Update useUpdatePayroll to handle individual allowance fields |

---

## Technical Details

### Animation Classes (Already in Tailwind):
- `animate-pulse` - Built-in Tailwind pulsing animation

### New States in PayrollView:
- `editTicketIncluded: boolean` - Track if ticket checkbox is checked
- `editTicketAmount: number` - The ticket amount to add

### New Import:
- `Bell` from lucide-react
- `useProcessTicketAllowance` from useTicketAllowance (to mark ticket as processed)

---

## Expected Behavior

1. **After Bulk Generate**: Any employee with an approved ticket allowance (not yet processed) will show a pulsing bell icon with the amount
2. **Edit Dialog**: If employee is eligible, checkbox appears. Checking it adds ticket amount to payroll
3. **Save**: When saved with ticket included, the ticket allowance record is marked as "processed" and linked to the payroll
4. **Badge Updates**: The pulsing bell disappears once ticket is included in payroll

