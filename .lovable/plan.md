

# Plan: Fix Ticket Allowance Eligibility Logic

## Problem Summary

The ticket allowance system has two critical bugs:

### Bug #1: All Approved Tickets Show as Eligible
The payroll UI shows ALL approved-but-unprocessed ticket allowances as "eligible", regardless of the payroll month. For example, Dennis's 2022 and 2024 tickets (which should have been processed years ago) are showing as eligible in January 2026.

### Bug #2: Future Eligibility Dates Were Incorrectly Approved
The "Auto-Approve Past" tool approved records with FUTURE eligibility dates (like 2025-09-01, 2026-01-01) - these should remain as "pending" until their eligibility date arrives.

---

## Database Evidence

**Dennis P. Sotto** (Joining: 2020-09-13):
| Cycle | Eligibility Date | Should Be Eligible | Current Status |
|-------|-----------------|-------------------|----------------|
| 1st | 2022-09-13 | Yes (past) | approved ✓ |
| 2nd | 2024-09-13 | Yes (past) | approved ✓ |
| 3rd | 2026-09-13 | No (future) | Not created yet ✓ |

**Incorrectly Approved Future Records:**
- Ashley Scott Dadula: 2025-03-30 (should be pending)
- Eulogio E. Dadula: 2025-12-01 (should be pending)
- Gelene A. Viray: 2025-09-01 (should be pending)
- Glorie Ann I. Espinosa: 2026-01-01 (should be pending)
- Homer S. Macrohon: 2025-09-01 (should be pending)
- And several more...

---

## Solution

### Step 1: Fix Data - Revert Incorrectly Approved Future Records

Execute SQL to reset future-dated records back to "pending":

```sql
UPDATE ticket_allowance_records
SET status = 'pending',
    approved_at = NULL,
    approved_by = NULL,
    amount = NULL,
    notes = NULL,
    updated_at = NOW()
WHERE status = 'approved'
  AND eligibility_start_date > CURRENT_DATE
  AND processed_in_payroll_id IS NULL;
```

### Step 2: Fix useApprovedTicketAllowances Hook

**File: `src/hooks/useTicketAllowance.ts`**

The hook should only return approved tickets where the eligibility date has passed:

```typescript
export function useApprovedTicketAllowances() {
  return useQuery({
    queryKey: ['approved-ticket-allowances'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('ticket_allowance_records')
        .select(`
          *,
          employees(full_name, hrms_no, department)
        `)
        .eq('status', 'approved')
        .is('processed_in_payroll_id', null)
        .lte('eligibility_start_date', today)  // Only past/current eligibility
        .order('eligibility_start_date', { ascending: true });
      
      if (error) throw error;
      return data as TicketAllowanceRecord[];
    },
  });
}
```

### Step 3: Fix Auto-Approve Tool to Validate Dates

**File: `src/components/admin/TicketAllowanceReminders.tsx`** (or wherever the auto-approve logic is)

Add validation to only approve records where eligibility_start_date has passed:

```typescript
const handleAutoApprovePast = async () => {
  const today = new Date().toISOString().split('T')[0];
  
  // Only approve records where eligibility date has passed
  const pastPendingRecords = pendingRecords.filter(r => 
    r.eligibility_start_date <= today
  );
  
  for (const record of pastPendingRecords) {
    await approveTicketAllowance.mutateAsync({
      id: record.id,
      amount: defaultAmount,
      notes: 'Auto-approved (past eligibility)'
    });
  }
};
```

### Step 4: Add Payroll Month Filtering (Optional Enhancement)

For better UX, the payroll system could only show ticket eligibility relevant to the selected payroll month. However, since approved tickets can be processed at any time, the current behavior (showing all unprocessed approved tickets) is acceptable after fixing the eligibility date filter.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useTicketAllowance.ts` | Add `.lte('eligibility_start_date', today)` filter to useApprovedTicketAllowances |
| `src/components/admin/TicketAllowanceReminders.tsx` | Add date validation to auto-approve logic |

---

## Expected Result After Fix

1. **Dennis**: Will show 2 approved tickets (2022, 2024) as eligible for processing
2. **Future records**: Will be reverted to "pending" and won't appear in payroll eligibility
3. **Auto-approve**: Will only approve records where the eligibility date has passed
4. **Next ticket cycle**: Dennis's 3rd cycle (September 2026) will be created when the edge function runs after that date

---

## Technical Summary

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Dennis showing eligible | Has unprocessed 2022/2024 approved tickets | These are valid - need to process them or mark as processed |
| Future dates approved | Auto-approve tool didn't check eligibility_start_date | Add date validation filter |
| All approved tickets showing | useApprovedTicketAllowances has no date filter | Add `.lte('eligibility_start_date', today)` |

