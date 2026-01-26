
# Plan: Email HR When Employee Submits Leave Request (with Attachment)

## Current Situation

When an employee submits a leave request:
1. The request is saved to the database
2. Any attachment is uploaded to the `leave-attachments` bucket
3. **Currently**: No notification is sent to HR

HR only receives notifications after **approving/rejecting** (as CC), not when the request is **submitted**.

---

## Implementation Details

### 1. Create New Edge Function: `send-leave-request-notification`

**File:** `supabase/functions/send-leave-request-notification/index.ts`

This function will:
1. Receive the `leave_id` after successful submission
2. Fetch the complete leave record with employee details
3. Fetch the attachment URL if present
4. Send an HTML email to HR (`HR_NOTIFICATION_EMAIL`)
5. Include a link/preview of the attachment in the email

**Payload:**
```typescript
{
  leave_id: string;
}
```

**Email Content:**
- Employee name, HRMS No, Department
- Leave type, dates, duration
- Employee's reason
- Request submitted timestamp
- **Attachment link** (if provided) - clickable button to view/download
- Action buttons: Link to Admin Dashboard to review

---

### 2. Update `supabase/config.toml`

Add configuration for the new function:

```toml
[functions.send-leave-request-notification]
verify_jwt = false
```

---

### 3. Modify `src/hooks/useLeave.ts`

**Location:** `useAddLeave` mutation's `onSuccess` callback (Line 459-464)

After the leave request is created, call the edge function:

```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['leave'] });
  queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
  queryClient.invalidateQueries({ queryKey: ['all_leave_balances'] });
  toast.success('Leave request submitted');
  
  // Send email notification to HR about new leave request
  if (data?.id) {
    supabase.functions.invoke('send-leave-request-notification', {
      body: { leave_id: data.id }
    }).catch(err => console.error('Failed to send leave request notification:', err));
  }
},
```

---

## Email Template Design

**Subject:** `📩 New Leave Request: [Employee Name] - [Leave Type]`

**Email Body:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📩 NEW LEAVE REQUEST                                        │
│                                                             │
│ From: Mark John J. Ramirez                                  │
│ HRMS No: HRMS NO. 0015                                      │
│ Department: Finance                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📋 Leave Details                                            │
├─────────────────────────────────────────────────────────────┤
│ Type:        Sick Leave                                     │
│ Duration:    Jan 27, 2026 (1 day)                          │
│ Reason:      Fever                                          │
│                                                             │
│ ⏱️ Submitted: Jan 26, 2026 at 6:44 PM                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📎 ATTACHMENT                                               │
│                                                             │
│ [View/Download Attachment]  ← Clickable button              │
└─────────────────────────────────────────────────────────────┘

Please review and approve/reject this request in the HRMS portal.

---
MABDC HR System
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/send-leave-request-notification/index.ts` | **Create** | Edge function to email HR on new leave requests with attachments |
| `supabase/config.toml` | Modify | Add function configuration |
| `src/hooks/useLeave.ts` | Modify | Add edge function call in `useAddLeave.onSuccess` |

---

## Technical Flow

```
Employee Submits Leave Request
         │
         ▼
LeaveRequestModal.handleSubmit()
         │
         ├── Upload attachment to 'leave-attachments' bucket
         │
         └── addLeave.mutate({ ..., attachment_url })
                  │
                  ▼
         Database Insert ✓
                  │
                  ▼
         onSuccess callback
                  │
                  ▼
         supabase.functions.invoke('send-leave-request-notification')
                  │
                  ▼
         Edge Function:
           1. Fetch leave record (incl. attachment_url)
           2. Fetch employee details
           3. Get HR email from HR_NOTIFICATION_EMAIL
           4. Send email with attachment link
                  │
                  ▼
         HR receives email:
           - Employee info
           - Leave details
           - Attachment link (if any)
           - Request timestamp
```

---

## Summary

| Feature | Description |
|---------|-------------|
| Trigger | When employee submits leave request |
| Recipient | HR email from `HR_NOTIFICATION_EMAIL` |
| Content | Employee info, leave details, reason, timestamps |
| Attachment | Included as clickable link/button in email |
| Email Service | Resend API (same as other notifications) |
| Error Handling | Non-blocking - leave request still succeeds if email fails |
