

# Disable Approval Email Notifications

## What Will Change

Add an early-return guard at the top of the two edge functions that send approval action emails to HR (`myranelsotto@gmail.com`). This will skip all email sending while keeping the functions intact so they can be re-enabled later by simply removing the guard.

### Functions to Disable

1. **`send-leave-request-notification`** -- Sends the "New Leave Request" email with Approve/Reject buttons to HR
2. **`send-appeal-request-notification`** -- Sends the "New Attendance Appeal" email with Approve/Reject buttons to HR

### How

In each function's handler, right after the OPTIONS check, add:

```typescript
// EMAIL SENDING DISABLED - re-enable by removing this block
console.log("Email sending is currently disabled");
return new Response(
  JSON.stringify({ success: true, message: "Email sending disabled" }),
  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

This means:
- No approval emails will be sent to `myranelsotto@gmail.com`
- Leave requests and appeals will still be created in the database normally
- The dashboard approve/reject buttons will still work
- The `process-email-approval` function stays untouched (existing tokens still work if clicked)
- To re-enable later, just remove the early-return block

### Files Changed
- `supabase/functions/send-leave-request-notification/index.ts` (add early return at line ~212)
- `supabase/functions/send-appeal-request-notification/index.ts` (add early return at line ~206)

