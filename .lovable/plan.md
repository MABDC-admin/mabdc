
# Plan: Filter Ticket Eligibility by Payroll Month (Biennial Anniversary Match)

## Problem Summary

Currently, the system shows "Ticket Eligible" for ALL employees with approved-but-unprocessed tickets where the eligibility date has passed. This is incorrect.

**Example - Myranel D. Plaza:**
- Joining Date: October 13, 2020
- Biennial Eligibility: October 13, 2022, October 13, 2024, October 13, 2026...
- **Current Behavior**: Shows as eligible in January 2026 payroll (wrong!)
- **Expected Behavior**: Should ONLY show as eligible in October payroll months

## Business Logic

Ticket eligibility should be **month-specific**:
1. An employee's ticket allowance eligibility is tied to their **biennial anniversary month**
2. The "Ticket Eligible" indicator should ONLY appear in the payroll view when:
   - The **selected payroll month** matches the employee's **eligibility month**
   - The ticket is approved but not yet processed
3. Once the eligibility month passes without processing, the ticket should no longer show (it can be processed retroactively via admin tools if needed)

## Solution

### Modify `useApprovedTicketAllowances` Hook

Add a parameter for the selected payroll month and filter tickets where the eligibility month matches the payroll month.

**File: `src/hooks/useTicketAllowance.ts`**

```typescript
// Fetch approved but not processed ticket allowances for a specific payroll month
export function useApprovedTicketAllowances(payrollMonth?: string) {
  return useQuery({
    queryKey: ['approved-ticket-allowances', payrollMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_allowance_records')
        .select(`
          *,
          employees(full_name, hrms_no, department, joining_date)
        `)
        .eq('status', 'approved')
        .is('processed_in_payroll_id', null)
        .order('eligibility_start_date', { ascending: true });
      
      if (error) throw error;
      
      // If payrollMonth is provided (e.g., "2026-01"), filter by matching month
      if (payrollMonth) {
        const [year, month] = payrollMonth.split('-').map(Number);
        
        return (data || []).filter(ticket => {
          const eligDate = new Date(ticket.eligibility_start_date);
          const eligMonth = eligDate.getMonth() + 1; // 1-12
          const eligYear = eligDate.getFullYear();
          
          // Show if eligibility month matches payroll month AND eligibility year <= payroll year
          return eligMonth === month && eligYear <= year;
        });
      }
      
      return data as TicketAllowanceRecord[];
    },
    enabled: true,
  });
}
```

### Update PayrollView Component

Pass the `selectedMonth` to the hook:

**File: `src/components/views/PayrollView.tsx`**

```typescript
// Change from:
const { data: approvedTicketAllowances = [] } = useApprovedTicketAllowances();

// To:
const { data: approvedTicketAllowances = [] } = useApprovedTicketAllowances(selectedMonth);
```

## Expected Results

| Employee | Joining Date | Eligibility Month | January 2026 Payroll | October 2026 Payroll |
|----------|-------------|-------------------|---------------------|---------------------|
| Myranel D. Plaza | Oct 13, 2020 | October | ❌ Not shown | ✅ Shows eligible |
| Glorie Ann I. Espinosa | Jan 1, 2022 | January | ✅ Shows eligible | ❌ Not shown |
| Eulogio E. Dadula | Dec 1, 2021 | December | ❌ Not shown | ❌ Not shown |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useTicketAllowance.ts` | Add `payrollMonth` parameter to `useApprovedTicketAllowances` and filter by month match |
| `src/components/views/PayrollView.tsx` | Pass `selectedMonth` to `useApprovedTicketAllowances` |

## Technical Notes

1. The filter compares the eligibility month (1-12) with the payroll month
2. Past eligibility years are included (e.g., 2024 October ticket shows in 2025 October payroll if unpaid)
3. This ensures HR only sees ticket eligibility relevant to the current payroll period
4. Admin tools (TicketAllowanceReminders) will continue to show all pending/approved tickets for management purposes
