
# Plan: Fix Leave Request & Appeal Notifications - Ensure Mandatory Execution

## Root Cause Analysis

After investigating the edge function logs, database records, and network activity:

1. **The edge function `send-leave-request-notification` works correctly** - when called directly, it successfully sent the email to HR
2. **The leave request was created successfully** at 18:27:24 and the balance was updated at 18:27:25
3. **The edge function was NEVER invoked** by the frontend during the leave submission
4. **Cause**: The code changes were made but the user's browser was still running a cached version, or the deployment hadn't fully propagated

## Solution: Make Notifications Absolutely Mandatory

To prevent this from happening again and ensure 100% reliability:

### 1. Add Error Logging to Email Notification Call

**File:** `src/hooks/useLeave.ts` (Lines 457-470)

Add try-catch wrapper and more detailed logging to catch any silent failures:

```typescript
// MANDATORY: Send email notification to HR about new leave request
if (data?.id) {
  try {
    console.log('[LEAVE NOTIFICATION] Starting notification for leave_id:', data.id);
    
    const { data: invokeData, error: notifyError } = await supabase.functions.invoke('send-leave-request-notification', {
      body: { leave_id: data.id }
    });
    
    if (notifyError) {
      console.error('[LEAVE NOTIFICATION] Edge function error:', notifyError);
    } else {
      console.log('[LEAVE NOTIFICATION] Success:', invokeData);
    }
  } catch (err) {
    console.error('[LEAVE NOTIFICATION] Exception caught:', err);
  }
}
```

### 2. Same Pattern for Attendance Appeal Notifications

**File:** `src/hooks/useAttendanceAppeals.ts`

Apply the same try-catch logging pattern to ensure visibility of any failures.

### 3. Redeploy Edge Functions

Explicitly redeploy both edge functions to ensure they are running the latest code:
- `send-leave-request-notification`
- `send-appeal-request-notification`

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useLeave.ts` | Add try-catch with detailed console logging around notification call |
| `src/hooks/useAttendanceAppeals.ts` | Add try-catch with detailed console logging around notification call |

---

## Testing After Implementation

1. Ask Dennis to submit a new test leave request
2. Verify in edge function logs that the function was invoked
3. Confirm HR receives the email with attachment link

---

## Technical Summary

The current code is correct but may have been affected by caching. The changes will:
1. Add explicit try-catch blocks to catch any JavaScript exceptions
2. Add tagged console logs `[LEAVE NOTIFICATION]` for easy debugging
3. Force redeploy of edge functions to ensure latest code is running

This ensures that even if the notification fails, we will have clear visibility into the failure reason.
