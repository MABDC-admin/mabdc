
# Plan: Fix Leave Request & Appeal Submission Notifications to HR

## Problem Identified

### Issue 1: Leave Request Notifications Not Working
The `send-leave-request-notification` edge function shows **no logs at all**, which means either:
1. The function is not being called
2. The function is failing silently before any logging

**Current pattern** (src/hooks/useLeave.ts:466-470):
```typescript
if (data?.id) {
  supabase.functions.invoke('send-leave-request-notification', {
    body: { leave_id: data.id }
  }).catch(err => console.error('Failed to send leave request notification:', err));
}
```

**Problem:** This is a "fire and forget" pattern that:
- Does not await the result
- Silently swallows errors to console
- Provides no user feedback on success/failure

### Issue 2: No HR Notification for Appeal Submissions
Currently, `useAddAttendanceAppeal` does **not** notify HR when an employee submits an appeal - only when HR approves/rejects it.

---

## Solution: Match the Payslip Email Pattern

The payslip email works reliably because it:
1. Uses `await` to wait for the response
2. Throws on error to show feedback
3. Provides success toast to confirm delivery

### Changes Required

### 1. Create Edge Function: `send-appeal-request-notification`
**(New file)** - Notifies HR when employee submits an appeal

**File:** `supabase/functions/send-appeal-request-notification/index.ts`

This will:
- Fetch appeal details + employee info
- Send email to HR (`HR_NOTIFICATION_EMAIL`)
- Log to `email_history` table
- Use `SMTP_FROM_EMAIL` for verified sender

---

### 2. Update `src/hooks/useLeave.ts` - Make Notification Mandatory

**Current (Line 459-471):**
```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['leave'] });
  queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
  queryClient.invalidateQueries({ queryKey: ['all_leave_balances'] });
  toast.success('Leave request submitted');
  
  if (data?.id) {
    supabase.functions.invoke('send-leave-request-notification', {
      body: { leave_id: data.id }
    }).catch(err => console.error('Failed to send leave request notification:', err));
  }
},
```

**Updated (Move notification inside mutationFn to make it mandatory):**
```typescript
mutationFn: async (leave: Omit<LeaveRecord, 'id' | 'created_at' | 'employees'>) => {
  const { data, error } = await supabase
    .from('leave_records')
    .insert([leave])
    .select()
    .single();
  
  if (error) throw error;
  
  // ... existing balance update logic ...
  
  // MANDATORY: Send email notification to HR
  if (data?.id) {
    const { error: notifyError } = await supabase.functions.invoke('send-leave-request-notification', {
      body: { leave_id: data.id }
    });
    
    if (notifyError) {
      console.error('Failed to notify HR:', notifyError);
      // Continue - don't fail the entire request, but log it
    }
  }
  
  return data;
},
```

---

### 3. Update `src/hooks/useAttendanceAppeals.ts` - Add HR Notification on Submit

**Current `useAddAttendanceAppeal` (Line 50-69):**
```typescript
export function useAddAttendanceAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appeal: ...) => {
      const { data, error } = await supabase
        .from('attendance_appeals')
        .insert([{ ...appeal, status: 'Pending' }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_appeals'] });
      toast.success('Appeal submitted successfully');
    },
    // ...
  });
}
```

**Updated (Add HR notification in mutationFn):**
```typescript
mutationFn: async (appeal: ...) => {
  const { data, error } = await supabase
    .from('attendance_appeals')
    .insert([{ ...appeal, status: 'Pending' }])
    .select()
    .single();
  if (error) throw error;
  
  // MANDATORY: Send email notification to HR about new appeal
  if (data?.id) {
    const { error: notifyError } = await supabase.functions.invoke('send-appeal-request-notification', {
      body: { appeal_id: data.id }
    });
    
    if (notifyError) {
      console.error('Failed to notify HR of appeal:', notifyError);
    }
  }
  
  return data;
},
```

---

### 4. Update `supabase/config.toml`

Add configuration for the new function:
```toml
[functions.send-appeal-request-notification]
verify_jwt = false
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/send-appeal-request-notification/index.ts` | **Create** | New edge function to email HR on appeal submission |
| `supabase/config.toml` | Modify | Add new function configuration |
| `src/hooks/useLeave.ts` | Modify | Move notification to mutationFn with await |
| `src/hooks/useAttendanceAppeals.ts` | Modify | Add HR notification on appeal submission |

---

## Email Flow After Implementation

```text
┌─────────────────────────────────────────────────────────────┐
│ LEAVE REQUEST FLOW                                          │
├─────────────────────────────────────────────────────────────┤
│ Employee submits leave request                              │
│         │                                                   │
│         ▼                                                   │
│ Database insert successful                                  │
│         │                                                   │
│         ▼                                                   │
│ AWAIT supabase.functions.invoke('send-leave-request-...')   │
│         │                                                   │
│         ▼                                                   │
│ HR receives: "📩 New Leave Request: Dennis Sotto"           │
│   - Employee info                                           │
│   - Leave details + reason                                  │
│   - Attachment link (if any)                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ APPEAL SUBMISSION FLOW (NEW)                                │
├─────────────────────────────────────────────────────────────┤
│ Employee submits attendance appeal                          │
│         │                                                   │
│         ▼                                                   │
│ Database insert successful                                  │
│         │                                                   │
│         ▼                                                   │
│ AWAIT supabase.functions.invoke('send-appeal-request-...')  │
│         │                                                   │
│         ▼                                                   │
│ HR receives: "📩 New Attendance Appeal: Dennis Sotto"       │
│   - Employee info                                           │
│   - Appeal date + requested times                           │
│   - Appeal message                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Details

### Email Configuration (Same as Working Payslip System)
| Setting | Source |
|---------|--------|
| From Email | `SMTP_FROM_EMAIL` (verified domain) |
| To Email | `HR_NOTIFICATION_EMAIL` |
| API | Resend via `RESEND_API_KEY` |

### Key Pattern Change
| Before | After |
|--------|-------|
| Fire-and-forget with `.catch()` | `await` with proper error handling |
| Silent failures | Logged errors (continue flow) |
| No confirmation | Mandatory execution |

---

## Summary

| Issue | Solution |
|-------|----------|
| Leave request notifications not reaching HR | Move invocation inside `mutationFn` with `await` |
| Appeal submissions not notifying HR | Create new edge function + trigger on submit |
| Silent error handling | Replace `.catch()` with `await` + error logging |
| No email logs | Proper logging + email_history tracking |
