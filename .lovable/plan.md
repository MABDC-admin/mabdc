
# Plan: Allow Email Resend with Badge Counter

## Current Implementation Analysis

### Current Behavior (Lines 858-888 in PayrollView.tsx):
```typescript
<Button 
  disabled={
    !record.employees?.work_email || 
    sendingEmailId === record.id ||
    emailStatusMap.get(record.employee_id)?.status === 'sent'  // ❌ DISABLES after 1 send
  }
```

**Problem**: The email button is disabled permanently after the first successful send. Admin cannot resend if employee didn't receive it or needs a corrected payslip.

### Current Email Status Map (Lines 85-104):
```typescript
// Only stores the MOST RECENT email per employee
if (email.employee_id && !map.has(email.employee_id)) {
  map.set(email.employee_id, { status, sentAt, error });
}
```

**Problem**: Only tracks latest email status, not the total count of emails sent.

---

## Solution Overview

### 1. Update Email Status Map to Include Send Count

**File: `src/components/views/PayrollView.tsx`**

Modify the `emailStatusMap` to track:
- Latest status (sent/failed/pending)
- Total send count for badge display
- Sent timestamp for display

```typescript
const emailStatusMap = useMemo(() => {
  const map = new Map<string, { 
    status: string; 
    sentAt: string; 
    error?: string;
    sendCount: number;  // NEW: Track total emails sent
  }>();
  
  // Count all emails per employee for the selected month
  const countMap = new Map<string, number>();
  
  emailHistory.forEach(email => {
    if (email.employee_id) {
      // Count total emails
      const currentCount = countMap.get(email.employee_id) || 0;
      countMap.set(email.employee_id, currentCount + 1);
      
      // Store latest status (first in list since ordered by created_at desc)
      if (!map.has(email.employee_id)) {
        map.set(email.employee_id, { 
          status: email.status, 
          sentAt: email.created_at,
          error: email.error_message || undefined,
          sendCount: 1  // Will be updated after counting
        });
      }
    }
  });
  
  // Update with actual counts
  countMap.forEach((count, employeeId) => {
    const existing = map.get(employeeId);
    if (existing) {
      map.set(employeeId, { ...existing, sendCount: count });
    }
  });
  
  return map;
}, [emailHistory]);
```

### 2. Enable Resend Button (Remove Disable Condition)

**Change the Email Button Logic:**

```typescript
<Button 
  variant="outline" 
  size="sm" 
  onClick={() => handleEmailPayslip(record)}
  disabled={
    !record.employees?.work_email || 
    sendingEmailId === record.id
    // REMOVED: || emailStatusMap.get(record.employee_id)?.status === 'sent'
  }
  className={cn(
    "border-border relative",
    emailStatusMap.get(record.employee_id)?.status === 'sent' && 
      "border-green-300 dark:border-green-800"
  )}
  title={
    record.employees?.work_email 
      ? `Send to ${record.employees.work_email}` 
      : 'No work email configured'
  }
>
  {sendingEmailId === record.id ? (
    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
  ) : emailStatusMap.get(record.employee_id)?.status === 'sent' ? (
    <MailCheck className="w-4 h-4 mr-1 text-green-600" />
  ) : emailStatusMap.get(record.employee_id)?.status === 'failed' ? (
    <MailX className="w-4 h-4 mr-1 text-red-500" />
  ) : (
    <Mail className="w-4 h-4 mr-1" />
  )}
  
  {emailStatusMap.get(record.employee_id)?.status === 'sent' ? 'Resend' : 'Email'}
  
  {/* Badge Counter */}
  {(emailStatusMap.get(record.employee_id)?.sendCount || 0) > 0 && (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full bg-green-500 text-white">
      {emailStatusMap.get(record.employee_id)?.sendCount}
    </span>
  )}
</Button>
```

### 3. Update usePayslipEmailHistory Hook

**File: `src/hooks/useEmailHistory.ts`**

Make the hook return all emails for the month (not just filtered ones) to enable accurate counting:

```typescript
export function usePayslipEmailHistory(month: string) {
  return useQuery({
    queryKey: ["payslip-email-history", month],
    queryFn: async () => {
      // Format month for metadata matching
      const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { 
        month: 'long', year: 'numeric' 
      });
      
      const { data, error } = await supabase
        .from("email_history")
        .select("employee_id, status, created_at, error_message, metadata")
        .eq("email_type", "payslip")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Filter to only emails for this month based on metadata
      return (data || []).filter(email => {
        if (!email.employee_id) return false;
        // Check if metadata.month matches
        const emailMonth = email.metadata?.month;
        return emailMonth === monthLabel;
      });
    },
  });
}
```

---

## Visual Design

### Before (Current):
```
┌─────────────────────────────┐
│ ✓ Sent                      │  ← Disabled, cannot resend
└─────────────────────────────┘
```

### After (New):
```
┌─────────────────────────────┐
│ ✉️ Resend              [2]  │  ← Enabled, shows badge count
└─────────────────────────────┘
```

**Badge States:**
- **No sends**: No badge, button shows "Email"
- **1+ sends**: Green badge with count, button shows "Resend"
- **Failed**: Red icon, button enabled for retry

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/views/PayrollView.tsx` | Update emailStatusMap, modify button to allow resend, add badge counter |
| `src/hooks/useEmailHistory.ts` | Filter by month metadata, return all emails for counting |

---

## Expected Behavior After Implementation

1. **First Send**: Button shows "Email" → After sending → Button shows "Resend" with badge [1]
2. **Resend**: Admin clicks "Resend" → Email sent → Badge updates to [2]
3. **Failed**: Button shows red icon, admin can retry
4. **Multiple Months**: Badge resets per month (January 2026 emails don't show in December 2025)

---

## Technical Notes

- Badge uses absolute positioning to overlay on button
- Green badge indicates successful sends
- Email history query filtered by month metadata to ensure accurate per-month counting
- No database schema changes needed - uses existing `email_history` table
