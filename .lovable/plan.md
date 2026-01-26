
# Plan: Change "Miss Punch In" to "Absent" After Shift Ends

## Summary

When an employee doesn't check in and their shift has ended, show their status as **"Absent"** instead of "Miss Punch In" in the Time Clock Employee Time Records view.

---

## Current Behavior

| Scenario | Current Status Shown |
|----------|---------------------|
| No check-in, shift still ongoing | No status (waiting) |
| No check-in, after shift START time | Miss Punch In |
| No check-in, after shift END time | Miss Punch In |

## New Behavior

| Scenario | New Status Shown |
|----------|-----------------|
| No check-in, shift still ongoing | No status (waiting) |
| No check-in, after shift START but before END | Miss Punch In |
| No check-in, after shift END time | **Absent** |

---

## Technical Changes

### 1. Add "absent" to TimeClockStatus Type

**File:** `src/components/views/TimeClockView.tsx` (Line 40)

```typescript
// Before:
type TimeClockStatus = 'early_in' | 'late_entry' | 'early_out' | 'late_exit' | 'miss_punch_in' | 'miss_punch_out' | 'on_time' | 'appealed';

// After:
type TimeClockStatus = 'early_in' | 'late_entry' | 'early_out' | 'late_exit' | 'miss_punch_in' | 'miss_punch_out' | 'on_time' | 'appealed' | 'absent';
```

### 2. Add "Absent" to STATUS_LABELS

**File:** `src/components/views/TimeClockView.tsx` (Lines 56-65)

```typescript
const STATUS_LABELS: Record<TimeClockStatus, string> = {
  early_in: 'Early In',
  late_entry: 'Late Entry',
  early_out: 'Early Out',
  late_exit: 'Late Exit',
  miss_punch_in: 'Miss Punch In',
  miss_punch_out: 'Miss Punch Out',
  on_time: 'Present',
  appealed: 'Appealed',
  absent: 'Absent'  // NEW
};
```

### 3. Add "Absent" to STATUS_COLORS

**File:** `src/components/views/TimeClockView.tsx` (Lines 67-76)

```typescript
const STATUS_COLORS: Record<TimeClockStatus, string> = {
  // ... existing colors ...
  absent: 'bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-100'  // Gray for absent
};
```

### 4. Update dbStatusToTimeClock Mapping

**File:** `src/components/views/TimeClockView.tsx` (Line 200)

```typescript
// Change from:
'Absent': 'miss_punch_in',

// To:
'Absent': 'absent',
```

### 5. Update calculateStatus Logic

**File:** `src/components/views/TimeClockView.tsx` (Lines 239-243)

```typescript
// Before:
if (!checkIn) {
  if (isPastDate || (isViewingToday && now > new Date(`${dateStr}T${shiftStartTime}:00`))) {
    statuses.push('miss_punch_in');
  }
}

// After:
if (!checkIn) {
  const isPastShiftEnd = isPastDate || (isViewingToday && now > new Date(`${dateStr}T${shiftEndTime}:00`));
  const isPastShiftStart = isPastDate || (isViewingToday && now > new Date(`${dateStr}T${shiftStartTime}:00`));
  
  if (isPastShiftEnd) {
    // Shift has ended with no check-in = Absent
    statuses.push('absent');
  } else if (isPastShiftStart) {
    // Shift started but not ended = Miss Punch In (can still come)
    statuses.push('miss_punch_in');
  }
}
```

### 6. Update timeClockRecords useMemo Logic

**File:** `src/components/views/TimeClockView.tsx` (Lines 278-326)

Add similar logic to check if employee with no attendance record should be marked absent after shift end:

```typescript
// After getting dbStatuses, check if no attendance and shift has ended
if (!att) {
  const isPastShiftEnd = now > new Date(`${dateStr}T${shiftTimes.end}:00`);
  if (isPastDate || isPastShiftEnd) {
    statuses = ['absent'];
  }
}
```

### 7. Update statusStats to Include Absent

**File:** `src/components/views/TimeClockView.tsx` (Lines 365-382)

```typescript
const stats: Record<TimeClockStatus, number> = {
  // ... existing stats ...
  absent: 0  // NEW
};
```

### 8. Update Edit Status Map

**File:** `src/components/views/TimeClockView.tsx` (Line 449-458)

```typescript
const statusMap: Record<TimeClockStatus, string> = {
  // ... existing mappings ...
  absent: 'Absent'  // NEW - maps to database 'Absent' status
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/views/TimeClockView.tsx` | Add "absent" status type, labels, colors, and update logic |

---

## Visual Result

| Badge | Color | Description |
|-------|-------|-------------|
| Miss Punch In | Red | Employee hasn't checked in yet (shift ongoing) |
| Absent | Gray | Employee didn't check in and shift has ended |

---

## Summary

This change differentiates between:
- **Miss Punch In**: Employee is late but can still arrive (shift not over)
- **Absent**: Employee didn't show up at all (shift has ended)

This gives HR a clearer picture of attendance status.
