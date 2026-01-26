
# Plan: Auto Email Notifications for Leave/Appeal Decisions + Timestamps

## Current Situation

You have **3 pending leave requests** that can be used for testing:

| Employee | Leave Type | Dates | Reason | Submitted At (UTC) |
|----------|-----------|-------|--------|-------------------|
| Mark John J. Ramirez | Sick Leave | Jan 27 | Fever | 2026-01-26 14:44:34 |
| Christine Mari M. Jonson | Sick Leave | Jan 19 | Fever/flu | 2026-01-26 08:13:20 |
| Glorie Ann I. Espinosa | Sick Leave | Jan 26 | Muscle pain, unable to stand/walk | 2026-01-26 06:15:46 |

---

## Implementation Details

### 1. Create Edge Function: `send-leave-decision-notification`

**File:** `supabase/functions/send-leave-decision-notification/index.ts`

This function will:
1. Receive leave_id and new status (Approved/Rejected)
2. Fetch leave record details including **created_at timestamp**
3. Fetch employee details (name, email, HRMS, department)
4. Send HTML email to employee's work_email via Resend API
5. Include the **Request Submitted At** timestamp in the email

**Payload:**
```typescript
{
  leave_id: string;
  status: 'Approved' | 'Rejected';
  rejection_reason?: string;
}
```

### 2. Create Edge Function: `send-appeal-decision-notification`

**File:** `supabase/functions/send-appeal-decision-notification/index.ts`

This function will:
1. Receive appeal_id and new status
2. Fetch appeal record details including **created_at timestamp**
3. Fetch employee details
4. Send HTML email to employee's work_email via Resend API
5. Include the **Appeal Submitted At** timestamp in the email

**Payload:**
```typescript
{
  appeal_id: string;
  status: 'Approved' | 'Rejected';
  rejection_reason?: string;
}
```

---

### 3. Update `supabase/config.toml`

Add configurations for both new functions:

```toml
[functions.send-leave-decision-notification]
verify_jwt = false

[functions.send-appeal-decision-notification]
verify_jwt = false
```

---

### 4. Modify `src/hooks/useLeave.ts`

**Location:** `useUpdateLeaveStatus` mutation's `onSuccess` callback

After the status update succeeds, call the edge function:

```typescript
onSuccess: async (data, variables) => {
  queryClient.invalidateQueries({ queryKey: ['leave'] });
  queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
  queryClient.invalidateQueries({ queryKey: ['all_leave_balances'] });
  toast.success(`Leave request ${variables.status.toLowerCase()}`);
  
  // Send email notification to employee
  if (variables.status === 'Approved' || variables.status === 'Rejected') {
    supabase.functions.invoke('send-leave-decision-notification', {
      body: {
        leave_id: variables.id,
        status: variables.status,
        rejection_reason: variables.rejection_reason
      }
    }).catch(err => console.error('Failed to send leave notification:', err));
  }
},
```

---

### 5. Modify `src/hooks/useAttendanceAppeals.ts`

**Location:** `useUpdateAttendanceAppeal` mutation's `onSuccess` callback

```typescript
onSuccess: async (data) => {
  queryClient.invalidateQueries({ queryKey: ['attendance_appeals'] });
  queryClient.invalidateQueries({ queryKey: ['attendance'] });
  
  // Send email notification to employee
  if (data.status === 'Approved' || data.status === 'Rejected') {
    supabase.functions.invoke('send-appeal-decision-notification', {
      body: {
        appeal_id: data.id,
        status: data.status,
        rejection_reason: data.rejection_reason
      }
    }).catch(err => console.error('Failed to send appeal notification:', err));
  }
},
```

---

## Email Template Design

### Leave Decision Email (with Timestamp)

**Subject (Approved):** `✅ Leave Approved: Sick Leave - Jan 27, 2026`
**Subject (Rejected):** `❌ Leave Rejected: Sick Leave - Jan 27, 2026`

**Email Body:**
```
Dear Mark John J. Ramirez,

Your leave request has been APPROVED.

┌─────────────────────────────────────────┐
│ Leave Details                           │
├─────────────────────────────────────────┤
│ Type:        Sick Leave                 │
│ Duration:    Jan 27, 2026 (1 day)       │
│ Your Reason: Fever                      │
│                                         │
│ ⏱️ Requested: Jan 26, 2026 at 6:44 PM   │
│ ✅ Approved:  Jan 26, 2026 at 10:05 PM  │
└─────────────────────────────────────────┘

Enjoy your time off!

---
MABDC HR System
```

### Appeal Decision Email (with Timestamp)

**Subject (Approved):** `✅ Attendance Appeal Approved - Jan 25, 2026`
**Subject (Rejected):** `❌ Attendance Appeal Rejected - Jan 25, 2026`

**Email Body:**
```
Dear Employee Name,

Your time correction appeal has been APPROVED.

┌─────────────────────────────────────────┐
│ Appeal Details                          │
├─────────────────────────────────────────┤
│ Date:           Jan 25, 2026            │
│ Corrected Time: In: 08:00 | Out: 17:00  │
│ Your Message:   [Appeal message]        │
│                                         │
│ ⏱️ Submitted: Jan 25, 2026 at 5:30 PM   │
│ ✅ Approved:  Jan 26, 2026 at 10:15 AM  │
└─────────────────────────────────────────┘

Your attendance record has been updated.

---
MABDC HR System
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/send-leave-decision-notification/index.ts` | Create | Edge function for leave decision emails with timestamps |
| `supabase/functions/send-appeal-decision-notification/index.ts` | Create | Edge function for appeal decision emails with timestamps |
| `supabase/config.toml` | Modify | Add function configurations |
| `src/hooks/useLeave.ts` | Modify | Add edge function call in `useUpdateLeaveStatus.onSuccess` |
| `src/hooks/useAttendanceAppeals.ts` | Modify | Add edge function call in `useUpdateAttendanceAppeal.onSuccess` |

---

## Testing Plan

After implementation, we will test by:

1. **Deploy the edge functions**
2. **Approve one of the 3 pending leave requests** from the Admin Dashboard
3. **Check if the employee receives the email** at their work_email address

The 3 employees who will receive test emails upon approval/rejection:
- **Mark John J. Ramirez** → ramirezmarkjohn@gmail.com
- **Christine Mari M. Jonson** → cmjonson01@yahoo.com  
- **Glorie Ann I. Espinosa** → espinosaglorieann@gmail.com

---

## Technical Flow

```
HR Approves/Rejects Leave
         │
         ▼
useUpdateLeaveStatus.mutate()
         │
         ▼
Database Updated ✓
         │
         ▼
onSuccess callback
         │
         ▼
supabase.functions.invoke('send-leave-decision-notification')
         │
         ▼
Edge Function:
  1. Fetch leave record (incl. created_at timestamp)
  2. Fetch employee work_email
  3. Send email via Resend API
         │
         ▼
Employee receives email with:
  - Leave details
  - Their reason
  - Request timestamp
  - Decision timestamp
```

---

## Summary

| Feature | Description |
|---------|-------------|
| Leave Decision Email | Sent to employee when HR approves/rejects leave |
| Appeal Decision Email | Sent to employee when HR approves/rejects appeal |
| Timestamps Included | Both request submission time and decision time |
| Recipient | Employee's `work_email` from database |
| Email Service | Resend API (same as payslip/absent notifications) |
| Error Handling | Non-blocking - UI update still succeeds if email fails |
