
# Plan: Add HR Email as CC on Leave/Appeal Decision Notifications

## Summary

When sending approval/rejection emails to employees, HR will also receive a copy (CC) as confirmation that the notification was sent successfully.

---

## Implementation Details

### 1. Update `send-leave-decision-notification/index.ts`

**Current Code (Lines 234-240):**
```typescript
// Send email via Resend
const emailResponse = await resend.emails.send({
  from: `MABDC HRMS <${fromEmail}>`,
  to: [recipientEmail],
  subject: subject,
  html: emailHtml,
});
```

**Updated Code:**
```typescript
// Get HR email for CC
const hrEmail = Deno.env.get("HR_NOTIFICATION_EMAIL");

// Send email via Resend
const emailResponse = await resend.emails.send({
  from: `MABDC HRMS <${fromEmail}>`,
  to: [recipientEmail],
  cc: hrEmail ? [hrEmail] : undefined,  // CC HR for confirmation
  subject: subject,
  html: emailHtml,
});
```

---

### 2. Update `send-appeal-decision-notification/index.ts`

**Current Code (Lines 235-241):**
```typescript
// Send email via Resend
const emailResponse = await resend.emails.send({
  from: `MABDC HRMS <${fromEmail}>`,
  to: [recipientEmail],
  subject: subject,
  html: emailHtml,
});
```

**Updated Code:**
```typescript
// Get HR email for CC
const hrEmail = Deno.env.get("HR_NOTIFICATION_EMAIL");

// Send email via Resend
const emailResponse = await resend.emails.send({
  from: `MABDC HRMS <${fromEmail}>`,
  to: [recipientEmail],
  cc: hrEmail ? [hrEmail] : undefined,  // CC HR for confirmation
  subject: subject,
  html: emailHtml,
});
```

---

## How It Works

| Field | Value |
|-------|-------|
| **To** | Employee's work email (e.g., `ramirezmarkjohn@gmail.com`) |
| **CC** | HR email from `HR_NOTIFICATION_EMAIL` secret (`myranelsotto@gmail.com`) |
| **From** | `MABDC HRMS <{SMTP_FROM_EMAIL}>` |

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-leave-decision-notification/index.ts` | Add `cc` field with HR email |
| `supabase/functions/send-appeal-decision-notification/index.ts` | Add `cc` field with HR email |

---

## Email Flow After Implementation

```
HR Approves Leave Request
         │
         ▼
Email Sent via Resend
  To: ramirezmarkjohn@gmail.com (Employee)
  CC: myranelsotto@gmail.com (HR - confirmation copy)
         │
         ├──► Employee receives: "✅ Leave Approved: Sick Leave"
         │
         └──► HR receives same email as CC (confirmation)
```

---

## Summary

| Feature | Description |
|---------|-------------|
| CC Recipient | HR email from `HR_NOTIFICATION_EMAIL` secret |
| Purpose | HR receives confirmation that approval/rejection email was sent |
| Fallback | If `HR_NOTIFICATION_EMAIL` not set, CC is omitted (email still sent to employee) |
