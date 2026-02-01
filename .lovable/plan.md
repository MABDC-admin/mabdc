
# Plan: Add Undertime Notification Edge Function

## Overview

Create a new edge function `send-undertime-notification` that sends email notifications to both HR/Admin and the specific employee when the system detects they are punching out early (undertime). The email will remind them to submit an exception or appeal explaining why they left early.

---

## Solution Design

### Email Recipients

1. **HR/Admin** - Uses existing `HR_NOTIFICATION_EMAIL` secret
2. **Employee** - Uses the employee's `work_email` from the database

### Email Content

The notification will include:
- Employee name, HRMS number, department, position
- Scheduled shift end time
- Actual checkout time
- Minutes left early
- Clear call-to-action to submit an appeal/exception

---

## Technical Implementation

### Part 1: Edge Function (`send-undertime-notification`)

**File:** `supabase/functions/send-undertime-notification/index.ts`

```typescript
// Request payload structure
interface UndertimeNotificationRequest {
  employeeName: string;
  employeeId: string;
  hrmsNo: string;
  department: string;
  jobPosition: string;
  employeeEmail: string;  // Work email for employee notification
  checkOutTime: string;   // e.g., "16:00"
  scheduledEndTime: string; // e.g., "17:00"
  minutesEarly: number;   // How many minutes before shift end
}
```

**Key Features:**
- Uses Resend API (same as `send-absent-notification`) for reliable delivery
- Sends two separate emails:
  1. **To HR/Admin**: Summary alert about the undertime
  2. **To Employee**: Personal reminder with appeal instructions
- Professional HTML email template matching existing MABDC style
- UAE timezone for timestamps

**Email Templates:**

**HR Email:**
- Subject: `⏰ Early Checkout Alert: {Employee Name} - {minutesEarly} mins early`
- Body: Employee details, scheduled vs actual time, summary

**Employee Email:**
- Subject: `Action Required: Please Submit Undertime Exception`
- Body: Friendly reminder that they checked out early, instructions to submit an appeal with the reason
- Appeal link (if applicable) or instructions

---

### Part 2: Frontend Integration

**Files to modify:**
1. `src/pages/AttendanceScanner.tsx`
2. `src/pages/QRScannerPage.tsx`
3. `src/hooks/useAttendance.ts`

**Pattern:** Add a `sendUndertimeNotification` function (similar to existing `sendLateNotification`) that triggers after checkout when undertime is detected.

**Integration Points:**

1. **AttendanceScanner.tsx** - After successful checkout with undertime status
2. **QRScannerPage.tsx** - Same logic for QR-based attendance
3. **useAttendance.ts** - In the `useCheckOutById` hook's `onSuccess` callback

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/send-undertime-notification/index.ts` | Create | Edge function for sending emails |
| `supabase/config.toml` | Modify | Add function configuration |
| `src/pages/AttendanceScanner.tsx` | Modify | Add undertime notification trigger |
| `src/pages/QRScannerPage.tsx` | Modify | Add undertime notification trigger |
| `src/hooks/useAttendance.ts` | Modify | Add undertime notification to checkout hooks |

---

## Edge Function Code Structure

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data = await req.json();
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const hrEmail = Deno.env.get("HR_NOTIFICATION_EMAIL");
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || "onboarding@resend.dev";

    // 1. Send to HR/Admin
    await resend.emails.send({
      from: `MABDC HRMS <${fromEmail}>`,
      to: [hrEmail],
      subject: `⏰ Early Checkout: ${data.employeeName} - ${data.minutesEarly} mins early`,
      html: generateHREmailHtml(data),
    });

    // 2. Send to Employee (if work email exists)
    if (data.employeeEmail) {
      await resend.emails.send({
        from: `MABDC HRMS <${fromEmail}>`,
        to: [data.employeeEmail],
        subject: `Action Required: Please Submit Undertime Exception`,
        html: generateEmployeeEmailHtml(data),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
```

---

## Frontend Integration Example

```typescript
// In AttendanceScanner.tsx - after checkout logic
const sendUndertimeNotification = async (employeeData: {
  employeeName: string;
  employeeId: string;
  hrmsNo: string;
  department: string;
  jobPosition: string;
  employeeEmail: string;
  checkOutTime: string;
  scheduledEndTime: string;
}) => {
  try {
    const [hours, minutes] = employeeData.checkOutTime.split(':').map(Number);
    const checkOutMinutes = hours * 60 + minutes;
    
    const [endHours, endMins] = employeeData.scheduledEndTime.split(':').map(Number);
    const scheduledMinutes = endHours * 60 + endMins;
    
    const minutesEarly = scheduledMinutes - checkOutMinutes;

    await supabase.functions.invoke('send-undertime-notification', {
      body: {
        ...employeeData,
        minutesEarly,
      },
    });
  } catch (error) {
    console.error('Failed to send undertime notification:', error);
  }
};

// Trigger in handleScan checkout success:
if (data.status?.includes('Undertime')) {
  sendUndertimeNotification({
    employeeName: data.employeeName,
    employeeId: data.employeeId,
    hrmsNo: result,
    department: data.department || '',
    jobPosition: data.jobPosition || '',
    employeeEmail: employee.work_email,
    checkOutTime: data.checkOutTime,
    scheduledEndTime: shiftTimes.end,
  });
}
```

---

## Email Design

### HR Email Template

```
┌─────────────────────────────────────────┐
│  ⏰ Early Checkout Alert                │
│  [Orange/Yellow gradient header]        │
├─────────────────────────────────────────┤
│  Employee: John Doe                     │
│  HRMS No: EMP001                        │
│  Department: Operations                 │
│  Position: Technician                   │
│  ─────────────────────────────          │
│  Scheduled End: 5:00 PM                 │
│  Actual Checkout: 4:00 PM               │
│  Early by: 60 minutes                   │
├─────────────────────────────────────────┤
│  ℹ️ The employee has been notified to   │
│  submit an exception or appeal.         │
└─────────────────────────────────────────┘
```

### Employee Email Template

```
┌─────────────────────────────────────────┐
│  ⏰ Action Required                     │
│  Please Submit Your Undertime Exception │
│  [Blue gradient header]                 │
├─────────────────────────────────────────┤
│  Hi John,                               │
│                                         │
│  Our system detected that you checked   │
│  out before your scheduled shift end    │
│  time today.                            │
│                                         │
│  Scheduled End: 5:00 PM                 │
│  Your Checkout: 4:00 PM                 │
│  Early by: 60 minutes                   │
│                                         │
│  Please submit an attendance appeal or  │
│  exception with your reason for the     │
│  early departure.                       │
│                                         │
│  ℹ️ You can do this through the         │
│  Employee Portal → Attendance Appeals   │
└─────────────────────────────────────────┘
```

---

## Config.toml Addition

```toml
[functions.send-undertime-notification]
verify_jwt = false
```

---

## Summary

| Component | Description |
|-----------|-------------|
| Edge Function | `send-undertime-notification` - sends emails to HR and employee |
| Email Service | Resend API (already configured) |
| Trigger Points | AttendanceScanner, QRScannerPage, useCheckOutById |
| Recipients | HR (`HR_NOTIFICATION_EMAIL`) + Employee (`work_email`) |
| No New Secrets | Uses existing RESEND_API_KEY, HR_NOTIFICATION_EMAIL, SMTP_FROM_EMAIL |

This implementation follows the exact same pattern as the existing `send-late-notification` and `send-absent-notification` functions, ensuring consistency across the notification system.
