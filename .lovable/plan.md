
# Plan: Matrix View Updates - Remove All-Employees View, Add LOP/Break Types, Change Appealed to Present

## Summary

This plan addresses four changes to the attendance matrix views:

1. **Delete "Matrix View - All Employees" button** - Remove the button and AttendanceMatrixView component from the calendar
2. **Add Spring Break (SB) and Winter Break (WB) to Monthly Matrix** - Already configured, needs legend update
3. **Change Appealed → Present (P)** - When an appeal is approved, display as "P" instead of "AP"
4. **Add LOP (Loss of Pay)** - Display LOP leave records in the matrix

---

## Changes Overview

| File | Action |
|------|--------|
| `src/components/attendance/EmployeeAttendanceCalendar.tsx` | Remove "Matrix View - All Employees" button and import |
| `src/components/attendance/MonthlyMatrixView.tsx` | Update legend to show SB/WB, change AP→P logic, add LOP status |
| `src/components/attendance/AttendanceMatrixView.tsx` | Delete entire file (no longer needed) |

---

## Detailed Changes

### 1. Remove "Matrix View - All Employees" Button

**File: `src/components/attendance/EmployeeAttendanceCalendar.tsx`**

- Remove the import for `AttendanceMatrixView`
- Remove the state variable `showMatrixView`
- Remove the conditional render for `AttendanceMatrixView`
- Remove the "Matrix View - All Employees" button

```typescript
// REMOVE these lines:
import { AttendanceMatrixView } from './AttendanceMatrixView';
const [showMatrixView, setShowMatrixView] = useState(false);
if (showMatrixView && !isEmployeePortal) {
  return <AttendanceMatrixView onBack={() => setShowMatrixView(false)} />;
}
<Button variant="default" onClick={() => setShowMatrixView(true)}>
  <Grid3X3 className="w-4 h-4 mr-2" />
  Matrix View - All Employees
</Button>
```

### 2. Delete AttendanceMatrixView.tsx

Delete the entire file `src/components/attendance/AttendanceMatrixView.tsx` since it will no longer be used.

---

### 3. Update MonthlyMatrixView - Appealed Shows as Present (P)

**File: `src/components/attendance/MonthlyMatrixView.tsx`**

Change the logic so that when `status === 'appealed'`, it returns `'P'` (Present) instead of `'AP'`:

```typescript
// BEFORE (line 244-245):
if (status === 'appealed') return 'AP';

// AFTER:
if (status === 'appealed') return 'P';  // Approved appeals show as Present
```

Remove `AP` from legend since it won't be used anymore.

---

### 4. Add LOP (Loss of Pay) Status

**File: `src/components/attendance/MonthlyMatrixView.tsx`**

Add LOP to the STATUS_CONFIG:
```typescript
LOP: { label: 'LOP', name: 'Loss of Pay', bg: 'bg-rose-400', text: 'text-rose-900', pdfBg: [251, 113, 133] },
```

Update STATUS_TO_DB mapping:
```typescript
'LOP': 'Loss of Pay',
```

Add LOP to EDITABLE_STATUSES:
```typescript
const EDITABLE_STATUSES = ['-', 'A', 'PH', 'P', 'L', 'SL', 'HDSL', 'VL', 'M', 'SB', 'WB', 'LOP', 'HDA', 'DO'] as const;
```

Update getDayStatus to detect LOP leave:
```typescript
// In the leave detection section (after line 205):
if (leave) {
  const leaveType = leave.leave_type?.toLowerCase() || '';
  if (leaveType.includes('sick')) return 'SL';
  if (leaveType.includes('vacation') || leaveType.includes('annual')) return 'VL';
  if (leaveType.includes('maternity')) return 'M';
  if (leaveType.includes('spring')) return 'SB';
  if (leaveType.includes('winter')) return 'WB';
  if (leaveType.includes('loss') || leaveType.includes('lop')) return 'LOP';  // NEW
  if (leaveType.includes('day off')) return 'DO';
  return 'VL';
}
```

Update LEGEND_ITEMS to include LOP, SB, WB and remove AP:
```typescript
const LEGEND_ITEMS = [
  { code: 'P', color: 'bg-emerald-500' },
  { code: 'L', color: 'bg-amber-400' },
  { code: 'A', color: 'bg-red-500' },
  { code: 'VL', color: 'bg-blue-500', label: 'On Leave' },
  { code: 'M', color: 'bg-pink-500', label: 'Maternity' },
  { code: 'SL', color: 'bg-lime-400', label: 'Sick' },
  { code: 'LOP', color: 'bg-rose-400', label: 'Loss of Pay' },  // NEW
  { code: 'SB', color: 'bg-violet-400', label: 'Spring Break' },  // NEW
  { code: 'WB', color: 'bg-violet-400', label: 'Winter Break' },  // NEW
  { code: 'W', color: 'bg-slate-200' },
  { code: 'DO', color: 'bg-purple-400', label: 'Day Off' },
  { code: 'H', color: 'bg-orange-400', label: 'Half Day' },
  { code: 'MP', color: 'bg-orange-500', label: 'Missed Punch' },
  { code: 'UT', color: 'bg-purple-400', label: 'Undertime' },
];
```

---

## Visual Summary

| Code | Meaning | Color | Note |
|------|---------|-------|------|
| P | Present | Green | Now includes approved appeals |
| L | Late | Amber | |
| A | Absent | Red | |
| VL | Annual/Vacation Leave | Blue | |
| M | Maternity Leave | Pink | |
| SL | Sick Leave | Lime | |
| **LOP** | Loss of Pay | Rose | **NEW** |
| **SB** | Spring Break | Violet | **Added to Legend** |
| **WB** | Winter Break | Violet | **Added to Legend** |
| W | Weekend | Slate | |
| DO | Day Off | Purple | |
| H | Half Day | Orange | |
| MP | Missed Punch | Orange | |
| UT | Undertime | Purple | |
| ~~AP~~ | ~~Appealed~~ | ~~Cyan~~ | **REMOVED - shows as P** |

---

## Files to Delete

| File | Reason |
|------|--------|
| `src/components/attendance/AttendanceMatrixView.tsx` | No longer used after button removal |

---

## Expected Behavior After Changes

1. **No "Matrix View - All Employees" button** - Only "Monthly Matrix View" button remains
2. **Appealed records show as "P"** - When HR approves an appeal, the cell displays green "P" not cyan "AP"
3. **LOP leave shows as "LOP"** - Rose-colored cell with "LOP" label for Loss of Pay leave
4. **SB/WB visible in legend** - Spring Break and Winter Break appear in the legend bar for HR reference
