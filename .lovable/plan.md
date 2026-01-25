

## Plan: Fix Time Clock Status Display and Logic Issues

### Issues Identified

After inspecting the Time Clock view and database:

1. **"On Time" should be "Present"**
   - Current: UI shows "On Time" for employees who checked in within scheduled time
   - Database stores: `Present`
   - User wants: Display "Present" to match database terminology

2. **Missing Punch Out Flag for Appealed/Present Records**
   - Found records where employees checked in but have no checkout:
     - Aimee June A. Alolor: check_in=07:19, check_out=NULL, status=Appealed
     - Jecille F. Buizon: check_in=07:23, check_out=NULL, status=Present
     - Mark John J. Ramirez: check_in=07:35, check_out=NULL, status=Present
     - Zeny M. Puguan: check_in=07:15, check_out=NULL, status=Appealed
   - Current logic: When status is "Appealed" or "Present", it shows ONLY that status
   - Issue: Missing "Miss Punch Out" flag for records without checkout

3. **Status Type Naming Inconsistency**
   - Internal type: `on_time` 
   - Display label: "On Time"
   - Database: "Present"
   - This creates confusion between UI and database

---

### Solution

#### Part 1: Rename "On Time" to "Present" Throughout

**Changes to STATUS_LABELS (line 56-65):**
```typescript
const STATUS_LABELS: Record<TimeClockStatus, string> = {
  early_in: 'Early In',
  late_entry: 'Late Entry',
  early_out: 'Early Out',
  late_exit: 'Late Exit',
  miss_punch_in: 'Miss Punch In',
  miss_punch_out: 'Miss Punch Out',
  on_time: 'Present',  // Changed from 'On Time'
  appealed: 'Appealed'
};
```

**Also update all UI references:**
- Status summary card (line 615): "On Time" → "Present"
- Filter dropdown (line 695): "On Time" → "Present"
- Edit dialog dropdown (line 863): "On Time" → "Present"
- Legend (line 897-898): "On Time" → "Present"

#### Part 2: Fix Status Logic for Missing Checkout

**Update timeClockRecords logic (lines 278-309):**

Add logic to append `miss_punch_out` when:
- Record has check-in BUT no check-out
- AND it's a past date OR past shift end time for today
- REGARDLESS of the database status (Appealed, Present, etc.)

```typescript
const timeClockRecords = useMemo<TimeClockRecord[]>(() => {
  return employees.map(emp => {
    // ... existing shift logic ...
    const att = attendanceMap.get(emp.id);
    
    // Get base status from database
    let statuses = att?.dbStatus ? dbStatusToTimeClock(att.dbStatus) : [];
    
    // If no database status, calculate from punch times
    if (statuses.length === 0) {
      statuses = calculateStatus(att?.checkIn, att?.checkOut, shiftTimes.start, shiftTimes.end, selectedDate, !!override);
    }
    
    // CRITICAL FIX: Check for missing checkout regardless of database status
    if (att?.checkIn && !att?.checkOut) {
      const isPastDate = selectedDate < new Date(format(new Date(), 'yyyy-MM-dd'));
      const now = new Date();
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const isPastShiftEnd = now > new Date(`${dateStr}T${shiftTimes.end}:00`);
      
      if (isPastDate || isPastShiftEnd) {
        // Add miss_punch_out if not already present
        if (!statuses.includes('miss_punch_out')) {
          statuses = [...statuses, 'miss_punch_out'];
        }
      }
    }
    
    return { ...record, status: statuses };
  });
}, [employees, shiftMap, overridesMap, attendanceMap, selectedDate]);
```

#### Part 3: Update dbStatusToTimeClock for Compound Logic

**Improve the status mapping (lines 179-209):**

The function should handle Appealed records that still need checkout flagging:

```typescript
const dbStatusToTimeClock = (dbStatus: string | undefined, hasCheckIn: boolean, hasCheckOut: boolean): TimeClockStatus[] => {
  if (!dbStatus) return [];
  
  // Handle compound statuses
  const compoundStatusMap: Record<string, TimeClockStatus[]> = {
    'Late | Undertime': ['late_entry', 'early_out'],
    'Miss Punch In | Undertime': ['miss_punch_in', 'early_out'],
  };
  
  if (compoundStatusMap[dbStatus]) {
    return compoundStatusMap[dbStatus];
  }
  
  const statuses: TimeClockStatus[] = [];
  
  // Single status mapping
  const statusMap: Record<string, TimeClockStatus> = {
    'Present': 'on_time',
    'Late': 'late_entry',
    'Undertime': 'early_out',
    'Missed Punch': 'miss_punch_in',
    'Miss Punch In': 'miss_punch_in',
    'Appealed': 'appealed',
    'Absent': 'miss_punch_in',
    'Half Day': 'early_out',
    'On Leave': 'on_time',
    'Holiday': 'on_time'
  };
  
  const mapped = statusMap[dbStatus];
  if (mapped) {
    statuses.push(mapped);
  }
  
  return statuses;
};
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/views/TimeClockView.tsx` | Rename "On Time" → "Present" in labels, fix missing checkout detection logic |

---

### Summary of Changes

| Location | Current | After Fix |
|----------|---------|-----------|
| STATUS_LABELS.on_time | "On Time" | "Present" |
| Summary Card | "On Time" | "Present" |
| Filter Dropdown | "On Time" | "Present" |
| Edit Dialog | "On Time" | "Present" |
| Legend | "On Time" | "Present" |
| Missing Checkout Logic | Only calculated statuses | Append `miss_punch_out` to ANY record without checkout (past shift end) |

---

### Visual Result After Fix

**Before (Current):**
| Employee | Status |
|----------|--------|
| Aimee June | Appealed |
| Jecille | On Time |

**After (Fixed):**
| Employee | Status |
|----------|--------|
| Aimee June | Appealed, Miss Punch Out |
| Jecille | Present, Miss Punch Out |

---

### Validation

The fix ensures:
1. UI terminology matches database (Present, not On Time)
2. Missing checkout is always flagged regardless of appeal status
3. Missed Punch Alerts section correctly shows all employees without checkout
4. Export to Excel uses correct "Present" label

