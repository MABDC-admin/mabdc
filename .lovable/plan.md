
# Plan: Fix Email Sending for Leave/Appeal Decision Notifications

## Problem Identified

The Edge Function logs clearly show the error:

```
You can only send testing emails to your own email address (stfxsa2024@gmail.com). 
To send emails to other recipients, please verify a domain at resend.com/domains, 
and change the `from` address to an email using this domain.
```

**Root Cause:** Both `send-leave-decision-notification` and `send-appeal-decision-notification` are using the hardcoded test sender:
```typescript
from: "MABDC HRMS <onboarding@resend.dev>"
```

This only allows sending to `stfxsa2024@gmail.com` (the Resend account owner).

---

## Why Payslip Emails Work

The `send-payslip-email` function correctly uses the verified domain:
```typescript
const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "onboarding@resend.dev";

await resend.emails.send({
  from: `${companyName} <${fromEmail}>`,
  to: [employeeEmail],
  // ...
});
```

The `SMTP_FROM_EMAIL` secret contains a verified domain email that can send to any recipient.

---

## Solution

Update both edge functions to use `SMTP_FROM_EMAIL` instead of the hardcoded test address.

### 1. Fix `send-leave-decision-notification/index.ts`

**Current (Line 232-237):**
```typescript
const emailResponse = await resend.emails.send({
  from: "MABDC HRMS <onboarding@resend.dev>",
  to: [recipientEmail],
  subject: subject,
  html: emailHtml,
});
```

**Fixed:**
```typescript
// Get the from email - use SMTP_FROM_EMAIL if set, otherwise fallback
const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "onboarding@resend.dev";

const emailResponse = await resend.emails.send({
  from: `MABDC HRMS <${fromEmail}>`,
  to: [recipientEmail],
  subject: subject,
  html: emailHtml,
});
```

---

### 2. Fix `send-appeal-decision-notification/index.ts`

**Current (Line 233-238):**
```typescript
const emailResponse = await resend.emails.send({
  from: "MABDC HRMS <onboarding@resend.dev>",
  to: [recipientEmail],
  subject: subject,
  html: emailHtml,
});
```

**Fixed:**
```typescript
// Get the from email - use SMTP_FROM_EMAIL if set, otherwise fallback
const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "onboarding@resend.dev";

const emailResponse = await resend.emails.send({
  from: `MABDC HRMS <${fromEmail}>`,
  to: [recipientEmail],
  subject: subject,
  html: emailHtml,
});
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-leave-decision-notification/index.ts` | Use `SMTP_FROM_EMAIL` for sender |
| `supabase/functions/send-appeal-decision-notification/index.ts` | Use `SMTP_FROM_EMAIL` for sender |

---

## Testing After Fix

1. Deploy the updated edge functions
2. Approve one of the pending leave requests from the Admin Dashboard
3. Verify the email is received by the employee (e.g., `ramirezmarkjohn@gmail.com`)

---

## Summary

| Issue | The sender email was hardcoded to `onboarding@resend.dev` |
|-------|----------------------------------------------------------|
| Effect | Resend blocks sending to external recipients with test domain |
| Solution | Use `SMTP_FROM_EMAIL` environment variable (verified domain) |
| Pattern | Same approach as the working `send-payslip-email` function |
