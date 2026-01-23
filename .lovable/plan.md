

## Plan: Fix Friday Attendance - Use Company Settings for Weekend Logic

### Problem Summary

The Employee Calendar shows Fridays as empty because:

1. The **Bulk Attendance Editor** uses hardcoded UAE weekend days (Friday & Saturday)
2. But your **company settings** define the work week as **Monday to Friday**
3. This caused attendance records to be created for Sundays but NOT Fridays

**Evidence from your database:**
- Friday Jan 2, 2026: Only 1 record
- Friday Jan 9, 2026: Only 1 record
- Sunday Jan 11, 2026: 31 records (should be weekend!)
- Friday Jan 23, 2026: 27 records (more recent, correct)

---

### Solution Overview

Fix the system to use your company's configured work week instead of hardcoded weekend days.

---

### Changes Required

#### 1. Create Weekend Calculation Utility

Create a new shared utility that calculates weekend days based on company settings:

**New File: `src/utils/workWeekUtils.ts`**

This utility will:
- Convert work week settings (e.g., "Monday" to "Friday") into day-of-week numbers
- Calculate which days are weekends based on the configured work week
- Be used consistently across all attendance components

```text
Input: work_week_start = "Monday", work_week_end = "Friday"
Output: Weekend days = [0, 6] (Sunday, Saturday)

Input: work_week_start = "Sunday", work_week_end = "Thursday"  
Output: Weekend days = [5, 6] (Friday, Saturday)
```

---

#### 2. Update AdminBulkAttendanceEditor

**File: `src/components/admin/AdminBulkAttendanceEditor.tsx`**

**Current (Hardcoded):**
```typescript
const UAE_WEEKEND_DAYS = [5, 6]; // Friday & Saturday
```

**New (Dynamic):**
- Import `useCompanySettings` hook
- Calculate weekend days from company settings
- Use the calculated weekend days instead of hardcoded values

---

#### 3. Update EmployeeAttendanceCalendar

**File: `src/components/attendance/EmployeeAttendanceCalendar.tsx`**

**Current (Hardcoded):**
```typescript
const isSat = dayOfWeek === 6;
const isSun = dayOfWeek === 0;
if (isSat || isSun) {
  return { type: 'weekend', ... };
}
```

**New (Dynamic):**
- Import company settings
- Use the weekend utility to check if a day is a weekend

---

#### 4. Update MonthlyMatrixView

**File: `src/components/attendance/MonthlyMatrixView.tsx`**

Same changes as above - replace hardcoded weekend logic with dynamic calculation.

---

#### 5. Update AttendanceMatrixView

**File: `src/components/attendance/AttendanceMatrixView.tsx`**

Same changes as above - replace hardcoded weekend logic with dynamic calculation.

---

#### 6. Update AttendanceScanner

**File: `src/pages/AttendanceScanner.tsx`**

**Current:**
```typescript
const isWorkDay = currentTime.getDay() >= 1 && currentTime.getDay() <= 5;
```

**New:**
- Use company settings to determine work days

---

#### 7. Fix Existing Data (One-Time)

After fixing the code, you will need to either:
- **Option A**: Use the updated Bulk Attendance Editor to create records for the missing Fridays
- **Option B**: Run a database query to populate Friday records

---

### Files to Modify

| File | Change |
|------|--------|
| `src/utils/workWeekUtils.ts` | **NEW** - Weekend calculation utility |
| `src/components/admin/AdminBulkAttendanceEditor.tsx` | Use company settings for weekends |
| `src/components/attendance/EmployeeAttendanceCalendar.tsx` | Use company settings for weekends |
| `src/components/attendance/MonthlyMatrixView.tsx` | Use company settings for weekends |
| `src/components/attendance/AttendanceMatrixView.tsx` | Use company settings for weekends |
| `src/pages/AttendanceScanner.tsx` | Use company settings for work days |

---

### Technical Details

#### Weekend Utility Function

```typescript
// src/utils/workWeekUtils.ts

const DAY_NAME_TO_NUMBER: Record<string, number> = {
  'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
  'Thursday': 4, 'Friday': 5, 'Saturday': 6
};

export function getWeekendDays(
  workWeekStart: string = 'Monday',
  workWeekEnd: string = 'Friday'
): number[] {
  const startDay = DAY_NAME_TO_NUMBER[workWeekStart];
  const endDay = DAY_NAME_TO_NUMBER[workWeekEnd];
  
  // Calculate working days
  const workingDays: number[] = [];
  let current = startDay;
  while (true) {
    workingDays.push(current);
    if (current === endDay) break;
    current = (current + 1) % 7;
  }
  
  // Weekend = all days NOT in working days
  return [0, 1, 2, 3, 4, 5, 6].filter(d => !workingDays.includes(d));
}

export function isWeekendDay(
  date: Date,
  workWeekStart: string = 'Monday',
  workWeekEnd: string = 'Friday'
): boolean {
  const weekendDays = getWeekendDays(workWeekStart, workWeekEnd);
  return weekendDays.includes(date.getDay());
}
```

#### Example Usage in Components

```typescript
// In any attendance component
const { data: companySettings } = useCompanySettings();

const isWeekend = isWeekendDay(
  date,
  companySettings?.work_week_start || 'Monday',
  companySettings?.work_week_end || 'Friday'
);
```

---

### After Implementation

With your current settings (Monday-Friday work week):
- **Work Days**: Monday, Tuesday, Wednesday, Thursday, Friday
- **Weekend Days**: Saturday, Sunday
- **Fridays will show attendance data** (not empty)
- **Sundays will show as "Weekend"** (grey, not clickable)

