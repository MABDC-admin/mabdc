
# Plan: Fix Contract Expiry Alerts Showing Archived Contracts

## Root Cause Identified

The system is showing **8 contracts expiring soon** when only **3 are truly expiring**. The 5 extra false alerts are from **Archived contracts** that were superseded by new contracts but still have their old `end_date` values.

### Data Evidence

| Contract Status | Count | Should Show Alert? |
|-----------------|-------|-------------------|
| Active | 3 | ✅ Yes |
| Archived | 5 | ❌ No (superseded contracts) |
| **Total Displayed** | **8** | **Should be 3** |

### Specific False Positives Found

| Employee | Archived Contract | Days Remaining | Has New Active Contract |
|----------|------------------|----------------|------------------------|
| Jecille F. Buizon | MB260249481AE | 10 days | ✅ MB308937462AE (1040 days) |
| Glorie Ann I. Espinosa | MOL-1768387021275 | 10 days | ✅ MB308610035AE (1040 days) |
| Princess Jesa D. Tagulao | MB260252057AE | 10 days | ✅ MB308866261AE (753 days) |
| Johnny Boy L. Dadula | MB260224075AE | 10 days | ✅ MB308637683AE (24 days) |
| Sheila Mae P. Dadula | MB260475973AE | 13 days | ✅ MB308609136AE (749 days) |

---

## Code Issue Analysis

The `getContractExpiryStatus` function in both views only excludes `'Expired'` and `'Terminated'` status:

```typescript
// Current (buggy) code:
if (contract.status === 'Expired' || contract.status === 'Terminated') return 'expired';
```

It should also exclude `'Archived'`:

```typescript
// Fixed code:
if (contract.status === 'Expired' || contract.status === 'Terminated' || contract.status === 'Archived') return 'expired';
```

---

## Files to Modify

### 1. `src/components/views/ContractsView.tsx`

**Line 138-145**: Update `getContractExpiryStatus` to exclude Archived contracts

```typescript
const getContractExpiryStatus = (contract: typeof contracts[0]) => {
  if (contract.status === 'Expired') {
    return { status: 'expired', label: 'Expired', icon: XCircle, color: 'bg-destructive/10 text-destructive border-destructive/30', daysLeft: null };
  }
  
  // NEW: Also treat Archived and Terminated contracts as inactive
  if (contract.status === 'Terminated' || contract.status === 'Archived') {
    return { status: 'terminated', label: contract.status, icon: XCircle, color: 'bg-muted/50 text-muted-foreground border-border', daysLeft: null };
  }
  // ... rest of function
};
```

### 2. `src/components/views/DashboardView.tsx`

**Line 101-109**: Update `getContractExpiryStatus` to exclude Archived contracts

```typescript
const getContractExpiryStatus = (contract: typeof contracts[0]) => {
  // Exclude Archived, Expired, and Terminated from alerts
  if (contract.status === 'Expired' || contract.status === 'Terminated' || contract.status === 'Archived') {
    return 'expired';
  }
  if (!contract.end_date) return 'active';
  const daysUntilExpiry = differenceInDays(parseISO(contract.end_date), new Date());
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= expiryThreshold) return 'expiring';
  if (daysUntilExpiry <= expiryThreshold * 2) return 'nearing';
  return 'active';
};
```

---

## Verification Points

After the fix:
- Dashboard "Contract Expiry Alerts" should show **3 contracts** (not 8)
- ContractsView "expiring" count should show **3 contracts** (not 8)
- The 5 Archived contracts should appear under "terminated" filter (grayed out)

---

## What's Already Correct (No Changes Needed)

| Component | Status | Reason |
|-----------|--------|--------|
| `check-contract-expiry` edge function | ✅ OK | Already filters to `["Active", "Approved"]` only |
| `useDocumentExpiryPriority` hook | ✅ OK | Already checks for `'Active'` or `'Approved'` status |
| `useContracts` hook query | ✅ OK | Fetches all contracts, filtering is done in UI |
| `useDocumentCompleteness` hook | ✅ OK | Uses `status === 'Active'` filter |

---

## Summary

A simple 2-line fix in two files will resolve the contract expiry alert discrepancy. The root cause is that the `'Archived'` contract status was not being filtered out in UI calculations, causing old superseded contracts to trigger false alerts.
