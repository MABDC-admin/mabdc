

## Plan: Allow Employees to Submit Appeals for All Attendance Records (Including Complete Records)

### Problem Identified

**Root Cause**: The Employee Calendar currently restricts appeals to only two scenarios:
1. **Missing attendance record** (no record exists)
2. **Missed punch** (only check-in OR check-out exists, but not both)

**Issue**: Employees like Jade Amurao with complete attendance records (both check-in and check-out present) - such as "Undertime", "Late", or even "Present" - cannot submit appeals because clicking on those days opens the **Detail Modal** (view-only) instead of the **Appeal Modal**.

**Friday Example (2026-01-23)**:
- Jade's Record: check_in=07:23, check_out=13:16, status="Undertime"
- Both punches exist → Appeal blocked → Only detail view shown

---

### Solution

Modify the Employee Calendar behavior to:
1. **Always show a "Request Correction" button** in the Detail Modal for employee portal users
2. OR **Change the day-click logic** to always allow appeals for any non-weekend day

**Recommended Approach**: Add an "Appeal" button to the Detail Modal when viewed from Employee Portal, so employees can:
- First see their attendance details
- Then choose to submit an appeal if needed

This is better UX because employees can review their record before deciding to appeal.

---

### Changes Required

#### 1. Update `AttendanceDetailModal.tsx`

Add a new prop `onRequestAppeal` and an "Appeal" button for employee portal users:

**Current Props:**
```typescript
interface AttendanceDetailModalProps {
  open: boolean;
  onClose: () => void;
  date: Date;
  attendance: AttendanceRecord | null;
  employeeId: string;
  employeeName: string;
  isHRView?: boolean;  // Currently determines if "Add Event" tab shows
}
```

**New Prop:**
```typescript
interface AttendanceDetailModalProps {
  // ... existing props
  onRequestAppeal?: () => void;  // NEW: Callback to open appeal modal
}
```

**Add Appeal Button**: At the bottom of the attendance details section (when `onRequestAppeal` is provided):

```
┌──────────────────────────────────────┐
│ 📅 Friday, January 23, 2026          │
├──────────────────────────────────────┤
│ Employee: Jade Amurao                │
│ ┌──────────────────────────────────┐ │
│ │ Status: Undertime                │ │
│ │ Check In: 07:23 AM               │ │
│ │ Check Out: 01:16 PM              │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [🔄 Request Time Correction]  ← NEW  │
│                                      │
└──────────────────────────────────────┘
```

---

#### 2. Update `EmployeeAttendanceCalendar.tsx`

Modify the `handleDayClick` logic to:
1. Store the selected date
2. Always open Detail Modal first
3. Pass a callback to transition to Appeal Modal

**Current Logic (lines 305-317):**
```typescript
if (isEmployeePortal) {
  const attendance = getAttendanceForDay(day);
  const isMissedPunch = attendance && ((attendance.check_in && !attendance.check_out) || (!attendance.check_in && attendance.check_out));
  if (isMissedPunch || !attendance) {
    setShowAppealModal(true);
  } else {
    setShowDetailModal(true);  // ← No appeal option here!
  }
}
```

**New Logic:**
```typescript
if (isEmployeePortal) {
  setShowDetailModal(true);  // Always show detail first
  // Appeal button in detail modal will trigger setShowAppealModal(true)
}
```

**Modal Connection:**
```typescript
<AttendanceDetailModal
  open={showDetailModal && isEmployeePortal}
  onClose={() => setShowDetailModal(false)}
  date={selectedDate!}
  attendance={selectedAttendance}
  employeeId={employeeId}
  employeeName={employeeName}
  isHRView={false}
  onRequestAppeal={() => {
    setShowDetailModal(false);
    setShowAppealModal(true);
  }}
/>
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/attendance/AttendanceDetailModal.tsx` | Add `onRequestAppeal` prop, render "Request Time Correction" button when provided |
| `src/components/attendance/EmployeeAttendanceCalendar.tsx` | Simplify day-click logic for employees, pass `onRequestAppeal` callback to detail modal |

---

### Technical Details

**AttendanceDetailModal.tsx changes:**

```typescript
// Add to props interface
onRequestAppeal?: () => void;

// Add button in the details TabsContent (after attendance display):
{onRequestAppeal && (
  <Button 
    variant="outline" 
    className="w-full mt-4"
    onClick={onRequestAppeal}
  >
    <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
    Request Time Correction
  </Button>
)}
```

**EmployeeAttendanceCalendar.tsx changes:**

```typescript
const handleDayClick = (day: Date) => {
  const isWeekend = weekendDays.includes(getDay(day));
  if (isWeekend) return;
  
  setSelectedDate(day);
  
  if (isEmployeePortal) {
    // Always show detail modal first - employees can appeal from there
    setShowDetailModal(true);
  } else {
    // HR view: show detail modal as before
    setShowDetailModal(true);
  }
};
```

---

### Result After Fix

When Jade Amurao (or any employee) clicks on Friday:

1. **Detail Modal opens** showing:
   - Status: Undertime
   - Check In: 07:23 AM
   - Check Out: 01:16 PM
   - **[Request Time Correction]** button at bottom

2. **Clicking "Request Time Correction"** opens the Appeal Modal where she can:
   - Enter corrected check-in/check-out times
   - Provide explanation message
   - Submit appeal for HR review

---

### Alternative Approach (Not Recommended)

Change day-click to always open Appeal Modal directly. However, this is worse UX because:
- Employee doesn't see current record before appealing
- More clicks needed if they just want to view details
- Inconsistent with HR view behavior

The recommended approach (detail modal with appeal button) provides better user experience.

