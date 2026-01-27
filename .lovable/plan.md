
# Plan: Exclude Terminated and Archived Employees from ALL Alerts

## Summary of Findings

After thorough investigation, I found that while several hooks and edge functions already filter by employee status, there are still **gaps where terminated/archived employees could appear in alerts**.

---

## Current Status by Component

| Component | Current Filtering | Issue |
|-----------|-------------------|-------|
| `useEmployees` hook | ✅ Filters out Resigned/Terminated | OK |
| `useDocumentRenewalQueue` hook | ✅ Uses `.eq('status', 'Active')` | OK |
| `send-document-expiry-notification` | ✅ Uses `.eq("status", "Active")` | OK |
| `check-contract-expiry` | ✅ Uses `.in("status", ["Active", "Approved"])` on contracts | OK |
| **DashboardView `expiringVisas`** | ❌ No employee status check | **NEEDS FIX** |
| **DashboardView contract alerts** | ✅ Recently fixed for Archived | OK |
| `useDocumentExpiryPriority` hook | Relies on passed employees array | Depends on caller |
| `EmployeeProfileModal` expiry alerts | Displays for any employee viewed | Acceptable (viewing profile) |

---

## Issue Identified

In `DashboardView.tsx`, the **expiringVisas** calculation (lines 94-98) doesn't filter by employee status:

```typescript
// Current code - NO STATUS CHECK
const expiringVisas = employees.filter(e => {
  if (!e.visa_expiration) return false;
  const days = Math.ceil((new Date(e.visa_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return days > 0 && days <= expiryThreshold;
});
```

While `useEmployees` already filters out Resigned/Terminated employees, adding an explicit check provides:
1. **Defense in depth** - protects against future changes to the hook
2. **Clarity** - makes the business logic explicit
3. **Consistency** - matches the pattern used elsewhere

---

## Files to Modify

### 1. `src/components/views/DashboardView.tsx`

**Add explicit employee status check to `expiringVisas` calculation:**

```typescript
// Lines 94-98: Add status filter
const expiringVisas = employees.filter(e => {
  // Exclude terminated, resigned, or archived employees
  const status = e.status as string;
  if (status === 'Terminated' || status === 'Resigned' || status === 'Archived') return false;
  
  if (!e.visa_expiration) return false;
  const days = Math.ceil((new Date(e.visa_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return days > 0 && days <= expiryThreshold;
});
```

### 2. `src/hooks/useDocumentExpiryPriority.ts`

**Add status validation at the start of employee processing:**

Although the hook receives employees from `useEmployees` (which already filters), adding a defensive check ensures robustness:

```typescript
// Line 59: Add status filter before processing
employees.forEach((employee) => {
  // Skip terminated/resigned/archived employees
  const status = employee.status as string;
  if (status === 'Terminated' || status === 'Resigned' || status === 'Archived') {
    return; // Skip this employee
  }
  
  const expiringDocuments: ExpiringDocument[] = [];
  // ... rest of processing
});
```

---

## What's Already Correctly Filtered (No Changes Needed)

| Component | Filter Used | Status |
|-----------|-------------|--------|
| `useDocumentRenewalQueue` | `.eq('status', 'Active')` | ✅ |
| `useDocumentRenewalQueue` documents | `doc.employees?.status !== 'Active'` check | ✅ |
| `useDocumentRenewalQueue` contracts | `.eq('employees.status', 'Active')` | ✅ |
| `send-document-expiry-notification` | `.eq("status", "Active")` | ✅ |
| `check-contract-expiry` | `.in("status", ["Active", "Approved"])` for contracts | ✅ |
| `ContractsView` expiry status | Recently fixed to exclude Archived | ✅ |
| `AdminContractsSection` expiry | Recently fixed to exclude Archived | ✅ |
| `DashboardView` contract alerts | Recently fixed to exclude Archived | ✅ |

---

## Changes Summary

| File | Change Description |
|------|-------------------|
| `src/components/views/DashboardView.tsx` | Add explicit status filter to `expiringVisas` calculation |
| `src/hooks/useDocumentExpiryPriority.ts` | Add defensive status check in employee processing loop |

---

## Technical Notes

- **Status values to exclude**: `'Terminated'`, `'Resigned'`, `'Archived'`
- **Status values to include**: `'Active'`, `'On Leave'`
- Using `as string` type cast for TypeScript compatibility with status comparisons
- The defensive checks provide extra safety even when upstream hooks already filter

---

## Expected Result

After implementation:
- Dashboard "Visa Alerts" will show only active employees
- Document expiry priority sorting will skip inactive employees
- All expiry-related UI counts will be accurate
- System stability improved by consistent filtering across all alert touchpoints
