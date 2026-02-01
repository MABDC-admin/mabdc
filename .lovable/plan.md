
# Plan: Fix Appealed Status Display When Requested Times Are NULL

## Problem Identified

When employees submit appeals, they sometimes fill in only the appeal message without providing the requested check-out time. For example:
- Appeal message: *"5:00pm please mam due to pre schoolers field trip"*
- `requested_check_out`: **NULL**

When this appeal is approved:
1. The attendance record's `check_out` gets set to NULL
2. The Monthly Matrix code skips the undertime check (since `check_out` is falsy)
3. The employee shows as **P (Present)** instead of **UT (Undertime)**

## Root Cause

The current approval flow in `AttendanceAppealsView.tsx` blindly copies `requested_check_out` to the attendance record, even when it's NULL:
```typescript
check_out: selectedAppeal.requested_check_out, // Can be NULL!
```

This overwrites the original check-out time with NULL.

## Solution

### Two-Part Fix

**Part 1: Preserve Original Times When Requested Times Are NULL (Approval Logic)**

When approving an appeal, if `requested_check_in` or `requested_check_out` is NULL, keep the original attendance record's time instead of overwriting it.

**Part 2: Handle NULL in Matrix Display (Fallback Safety)**

In the Monthly Matrix, when an "Appealed" record has NULL check_out, show as **UT** (since if someone appealed without specifying a checkout time, they likely had an undertime issue).

---

## Technical Changes

### File 1: `src/components/views/AttendanceAppealsView.tsx`

**Current behavior (lines 100-106):**
```typescript
await updateAttendance.mutateAsync({
  id: selectedAppeal.attendance_id,
  check_in: selectedAppeal.requested_check_in,
  check_out: selectedAppeal.requested_check_out,
  status: 'Appealed',
  admin_remarks: `[Appeal Approved] Time corrected: ${selectedAppeal.appeal_message}`,
});
```

**New behavior:**
```typescript
// Fetch original attendance record to preserve times if not specified in appeal
const { data: originalAttendance } = await supabase
  .from('attendance')
  .select('check_in, check_out')
  .eq('id', selectedAppeal.attendance_id)
  .single();

await updateAttendance.mutateAsync({
  id: selectedAppeal.attendance_id,
  // Use requested time if provided, otherwise keep original
  check_in: selectedAppeal.requested_check_in || originalAttendance?.check_in,
  check_out: selectedAppeal.requested_check_out || originalAttendance?.check_out,
  status: 'Appealed',
  admin_remarks: `[Appeal Approved] Time corrected: ${selectedAppeal.appeal_message}`,
});
```

### File 2: `src/components/attendance/MonthlyMatrixView.tsx`

**Current behavior (lines 250-273):**
```typescript
if (status === 'appealed') {
  if (attendance.check_out) {
    // ... undertime check
  }
  if (attendance.check_in) {
    // ... late check
  }
  return 'P';
}
```

**New behavior:**
```typescript
if (status === 'appealed') {
  // Check if undertime based on check_out time
  if (attendance.check_out) {
    const [hours, minutes] = attendance.check_out.split(':').map(Number);
    const checkOutMinutes = hours * 60 + minutes;
    const shiftEndMinutes = 17 * 60;
    if (checkOutMinutes < shiftEndMinutes - 15) {
      return 'UT';
    }
  } else {
    // No check_out time means the appeal was likely for undertime/missed punch
    // Show as UT since the original issue wasn't fully resolved
    return 'UT';
  }
  
  // Check if late based on check_in time
  if (attendance.check_in) {
    const [hours, minutes] = attendance.check_in.split(':').map(Number);
    const checkInMinutes = hours * 60 + minutes;
    const shiftStartMinutes = 8 * 60;
    if (checkInMinutes > shiftStartMinutes + 5) {
      return 'L';
    }
  }
  return 'P';
}
```

### File 3: `supabase/functions/process-email-approval/index.ts`

Same fix for email-based approvals (lines 283-292):
```typescript
// Fetch original attendance to preserve times if appeal didn't specify them
const { data: originalAtt } = await supabase
  .from("attendance")
  .select("check_in, check_out")
  .eq("id", existingAttendance.id)
  .single();

await supabase
  .from("attendance")
  .update({
    check_in: appealRecord.requested_check_in || originalAtt?.check_in,
    check_out: appealRecord.requested_check_out || originalAtt?.check_out,
    status: "Appealed",
    modified_at: new Date().toISOString(),
    modified_by: "Email Approval",
  })
  .eq("id", existingAttendance.id);
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `AttendanceAppealsView.tsx` | Preserve original check-in/check-out when appeal's requested times are NULL |
| `MonthlyMatrixView.tsx` | Show "UT" when check_out is NULL for appealed records (instead of "P") |
| `process-email-approval/index.ts` | Same preservation logic for email-based approvals |

---

## Expected Outcome

| Scenario | Before | After |
|----------|--------|-------|
| Appeal with `requested_check_out: NULL`, original checkout was 16:00 | P | UT |
| Appeal with `requested_check_out: 17:00` | P | P |
| Appeal with `requested_check_out: 16:00` | UT | UT |
| Appeal with no original attendance and no requested checkout | P | UT |

This ensures appeals are displayed correctly based on whether they cover the full shift or acknowledge an undertime situation.
