

## Plan: Fix Contract Expiry Display and Create Data Integrity Edge Function

### Problem Analysis

I've identified the root cause of the contract expiry notification not updating for Johnny Boy:

**Database Evidence (Johnny Boy's Contracts):**
1. **New Contract (Active)**: `MB308637683AE` | `end_date: 2026-02-20` | Created: `2026-01-19`
2. **Old Contract (Archived)**: `MB260224075AE` | `end_date: 2026-02-06` | Created: `2026-01-13`

The contract archiving is working correctly (old contract is "Archived", new contract is "Active").

**Root Cause**: The Employee Profile Modal correctly pulls `employeeContract` from the `contracts` table using `useMemo` and displays the correct expiry date. However, there are **two separate UI sections** that display contract/document information:

1. **Contract Card (Lines 533-579)** - Uses `employeeContract.end_date` - THIS IS CORRECT
2. **Document Status "Expiry Alerts" Section (Lines 716-752)** - Uses `currentEmployee.visa_expiration`, `emirates_id_expiry`, `passport_expiry` from the `employees` table - Contract expiry is NOT shown here

**The actual issue**: If the user is seeing outdated expiry dates, it's likely because:
- Old contract data was cached in React Query
- The `refetchContracts()` call isn't being invoked after the new contract upload
- The `useMemo` for `employeeContract` might be stale due to missing dependencies

---

### Solution Overview

Implement a three-part solution:

1. **Fix UI Refresh Issue** - Ensure contract data refreshes properly after upload
2. **Create Data Integrity Edge Function** - Periodic background job to detect and alert discrepancies
3. **Add Contract Expiry to Alert Section** - Show contract expiry alongside Visa/Emirates ID/Passport alerts

---

### Part 1: Fix Contract Refresh After Upload

**File: `src/components/modals/EmployeeProfileModal.tsx`**

The `handleContractPageUpload` function uploads contract page images but the contract expiry may come from Smart Upload with different dates. Add explicit query invalidation to ensure fresh data:

```typescript
// After updateContractImages.mutateAsync(), add:
import { useQueryClient } from '@tanstack/react-query';

// In the component:
const queryClient = useQueryClient();

// After successful upload:
await queryClient.invalidateQueries({ queryKey: ['contracts'] });
refetchContracts();
```

---

### Part 2: Create Data Integrity Edge Function

**New File: `supabase/functions/check-data-integrity/index.ts`**

This edge function will:
1. Run periodically (daily) via cron job
2. Detect discrepancies across the system
3. Send alerts to HR when issues are found

**Discrepancies to Check:**

| Check Type | Description |
|------------|-------------|
| **Multiple Active Contracts** | Employee has more than one "Active" contract |
| **Orphaned Contract Images** | Contract has page URLs but status is not Active |
| **Employee-Contract Mismatch** | Employee's `contract_type` doesn't match active contract's type |
| **Stale Document Renewals** | Documents marked `is_renewed=true` but no `renewed_document_id` |
| **Missing Contract for Active Employee** | Active employee has no active contract |
| **Expired Documents Not Marked** | Documents past expiry date but not marked properly |

**Function Structure:**

```typescript
// supabase/functions/check-data-integrity/index.ts

interface DataDiscrepancy {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  employee_id: string;
  employee_name: string;
  details: string;
  found_at: string;
}

// Checks to perform:
1. checkMultipleActiveContracts()
2. checkOrphanedContractImages()
3. checkStaledocumentRenewals()
4. checkMissingActiveContracts()
5. checkExpiredDocumentsNotMarked()
6. checkContractTypeConsistency()

// Output: Send email summary to HR if discrepancies found
```

---

### Part 3: Add Contract Expiry to Alerts Section

**File: `src/components/modals/EmployeeProfileModal.tsx`**

Currently, the "Expiry Alerts" section only shows Visa, Emirates ID, and Passport. Add contract expiry check:

```typescript
// In the Expiry Alerts section (lines 716-752), add contract check:

{getExpiryWarning(employeeContract?.end_date) && (
  <div className="flex items-center gap-2">
    <AlertTriangle className={cn("w-4 h-4", 
      getExpiryWarning(employeeContract?.end_date)?.type === 'expired' ? 'text-destructive' :
      getExpiryWarning(employeeContract?.end_date)?.type === 'urgent' ? 'text-amber-400' : 'text-yellow-400'
    )} />
    <span className="text-sm text-foreground">
      Contract: {getExpiryWarning(employeeContract?.end_date)?.text}
    </span>
  </div>
)}
```

---

### Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/functions/check-data-integrity/index.ts` | **NEW** - Data integrity checking edge function |
| `supabase/config.toml` | Add config for new edge function |
| `src/components/modals/EmployeeProfileModal.tsx` | Add contract expiry to alerts, add query invalidation |
| `src/hooks/useContracts.ts` | Add `useDataIntegrityCheck()` hook to manually trigger checks |

---

### Edge Function Implementation Details

**`check-data-integrity/index.ts`:**

```typescript
serve(async (req) => {
  // 1. Initialize Supabase client
  // 2. Run all integrity checks
  // 3. Collect discrepancies
  // 4. If discrepancies found:
  //    - Log to console with details
  //    - Send email alert to HR_NOTIFICATION_EMAIL
  //    - Return summary JSON
  
  const checks = [
    await checkMultipleActiveContracts(supabase),
    await checkOrphanedData(supabase),
    await checkStaleRenewals(supabase),
    await checkExpiredNotMarked(supabase),
    await checkMissingContracts(supabase),
  ];
  
  const discrepancies = checks.flat();
  
  if (discrepancies.length > 0 && HR_NOTIFICATION_EMAIL) {
    await sendDiscrepancyAlert(discrepancies, HR_NOTIFICATION_EMAIL);
  }
  
  return Response(JSON.stringify({
    success: true,
    checked_at: new Date().toISOString(),
    discrepancies_found: discrepancies.length,
    discrepancies,
  }));
});
```

**Check Functions:**

```typescript
// Check 1: Multiple Active Contracts
async function checkMultipleActiveContracts(supabase) {
  const { data } = await supabase
    .from('contracts')
    .select('employee_id, id, employees(full_name)')
    .eq('status', 'Active');
  
  // Group by employee_id, flag if count > 1
  const grouped = data.reduce((acc, c) => {
    acc[c.employee_id] = acc[c.employee_id] || [];
    acc[c.employee_id].push(c);
    return acc;
  }, {});
  
  return Object.entries(grouped)
    .filter(([_, contracts]) => contracts.length > 1)
    .map(([empId, contracts]) => ({
      type: 'MULTIPLE_ACTIVE_CONTRACTS',
      severity: 'critical',
      employee_id: empId,
      employee_name: contracts[0].employees?.full_name,
      details: `Employee has ${contracts.length} active contracts`,
    }));
}

// Check 2: Orphaned Contract Images
async function checkOrphanedData(supabase) {
  // Contracts with images but non-Active status
  const { data } = await supabase
    .from('contracts')
    .select('id, employee_id, page1_url, page2_url, status, employees(full_name)')
    .or('page1_url.not.is.null,page2_url.not.is.null')
    .not('status', 'eq', 'Active');
  
  // Return items where images exist but status is Expired/Archived (info level)
}

// Check 3: Expired Documents Not Marked
async function checkExpiredNotMarked(supabase) {
  const today = new Date().toISOString().split('T')[0];
  
  // Documents past expiry that aren't marked as renewed
  const { data } = await supabase
    .from('employee_documents')
    .select('id, name, expiry_date, is_renewed, employee_id, employees(full_name)')
    .lt('expiry_date', today)
    .eq('is_renewed', false);
  
  return data.map(doc => ({
    type: 'EXPIRED_DOCUMENT_NOT_MARKED',
    severity: 'warning',
    employee_id: doc.employee_id,
    employee_name: doc.employees?.full_name,
    details: `Document "${doc.name}" expired on ${doc.expiry_date} but not marked as renewed`,
  }));
}
```

---

### Cron Job Setup (Manual Step)

After the edge function is deployed, a cron job should be set up to run it daily. This requires running SQL in the database:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily integrity check at 6 AM UAE time (2 AM UTC)
SELECT cron.schedule(
  'daily-data-integrity-check',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fwdtjszxnnfqxjevlasm.supabase.co/functions/v1/check-data-integrity',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

---

### Email Alert Format

When discrepancies are found, HR receives an email like:

```
Subject: ⚠️ Data Integrity Alert: 3 Issues Found

┌────────────────────────────────────────────┐
│ 🔍 HRMS Data Integrity Report              │
│ Checked: 2026-01-24 06:00:00 UTC           │
├────────────────────────────────────────────┤
│ 🚨 CRITICAL (1)                            │
│ • Johnny Boy: 2 active contracts found     │
├────────────────────────────────────────────┤
│ ⚠️ WARNING (2)                             │
│ • Jane Doe: Emirates ID expired 5 days ago │
│ • John Smith: Contract renewal pending     │
└────────────────────────────────────────────┘
```

---

### Manual Trigger Option

Add a button to the Admin Dashboard or Settings page to manually trigger the integrity check:

```typescript
// In settings or admin view
const checkIntegrity = useCheckDataIntegrity();

<Button onClick={() => checkIntegrity.mutate()}>
  Run Data Integrity Check
</Button>
```

---

### Summary of Benefits

1. **Immediate Fix**: Contract expiry displays correctly using `employeeContract` from contracts table
2. **Proactive Monitoring**: Daily automated checks catch discrepancies before they become problems
3. **HR Visibility**: Email alerts ensure HR knows about issues regardless of origin (admin, HR, or employee portal)
4. **Audit Trail**: All discrepancies are logged with timestamps for review
5. **Self-Healing**: Some checks can automatically fix issues (e.g., marking expired contracts)

