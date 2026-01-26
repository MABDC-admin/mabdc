
# Plan: Optimize Kiosk Attendance Performance

## Problem Summary

The Kiosk Attendance is slow due to **4-5 sequential database calls per scan** and redundant polling alongside realtime subscriptions.

---

## Root Causes Identified

| Bottleneck | Current State | Impact |
|------------|---------------|--------|
| Shift validation | 2 sequential DB calls | ~200-400ms delay |
| Employee lookup | 1 DB call before operations | ~100-200ms delay |
| Attendance check | 1 DB call to verify existing | ~100-200ms delay |
| Final insert/update | 1 DB call | ~100-200ms delay |
| **Total latency** | **4-5 sequential calls** | **~500-1000ms per scan** |
| Redundant polling | 30-second refetch + realtime | Unnecessary network traffic |

---

## Optimization Strategy

### 1. Combine Shift Lookups into Single Query

**File: `src/utils/shiftValidation.ts`**

Replace 2 sequential queries with 1 combined query:

```typescript
export async function getEmployeeShiftTimes(employeeId: string, date: string): Promise<ShiftTimes> {
  // Single query that gets both override and permanent shift
  const [overrideResult, shiftResult] = await Promise.all([
    supabase
      .from('employee_shift_overrides')
      .select('shift_start_time, shift_end_time')
      .eq('employee_id', employeeId)
      .eq('override_date', date)
      .maybeSingle(),
    supabase
      .from('employee_shifts')
      .select('shift_type')
      .eq('employee_id', employeeId)
      .maybeSingle()
  ]);

  // Priority logic remains the same...
}
```

**Improvement:** 2 sequential calls → 1 parallel call (~50% faster)

---

### 2. Combine Employee + Attendance Check into Parallel Query

**File: `src/hooks/useAttendance.ts`**

In `useCheckInByHRMS` (lines 160-193), run employee lookup and shift times in parallel:

```typescript
// Current: Sequential
const employee = await getEmployee(hrmsNo);
const shiftTimes = await getEmployeeShiftTimes(employee.id, today);
const existing = await checkExistingAttendance(employee.id, today);

// Optimized: Parallel where possible
const employee = await getEmployee(hrmsNo);
const [shiftTimes, existing] = await Promise.all([
  getEmployeeShiftTimes(employee.id, today),
  supabase
    .from('attendance')
    .select('id, check_out')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .maybeSingle()
]);
```

**Improvement:** 3 sequential calls → 1 + 1 parallel (~40% faster)

---

### 3. Remove Redundant Polling in AttendanceScanner

**File: `src/pages/AttendanceScanner.tsx`**

Remove the 30-second polling (lines 79-81) since realtime is already handling updates:

```typescript
// REMOVE this effect - it's redundant with realtime
// useEffect(() => {
//   const interval = setInterval(() => refetch(), 30000);
//   return () => clearInterval(interval);
// }, [refetch]);
```

**Improvement:** Eliminates unnecessary network requests every 30 seconds

---

### 4. Add Realtime to KioskPage

**File: `src/pages/KioskPage.tsx`**

The page already uses `useRealtimeAttendance()` (line 51) which is correct. No change needed here.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/shiftValidation.ts` | Combine 2 DB calls into `Promise.all()` |
| `src/hooks/useAttendance.ts` | Parallelize employee lookup, shift check, and existing attendance check |
| `src/pages/AttendanceScanner.tsx` | Remove redundant 30-second polling |

---

## Expected Performance Improvement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Check-in latency | ~800-1000ms | ~400-500ms | **~50% faster** |
| Check-out latency | ~600-800ms | ~300-400ms | **~50% faster** |
| Network requests | Realtime + polling | Realtime only | **Cleaner** |
| DB calls per scan | 4-5 sequential | 2-3 parallel | **~50% reduction** |

---

## Technical Implementation Details

### Change 1: shiftValidation.ts

```typescript
// Lines 17-58 - Replace entire getEmployeeShiftTimes function
export async function getEmployeeShiftTimes(employeeId: string, date: string): Promise<ShiftTimes> {
  // Run both queries in parallel instead of sequential
  const [{ data: override }, { data: shift }] = await Promise.all([
    supabase
      .from('employee_shift_overrides')
      .select('shift_start_time, shift_end_time')
      .eq('employee_id', employeeId)
      .eq('override_date', date)
      .maybeSingle(),
    supabase
      .from('employee_shifts')
      .select('shift_type')
      .eq('employee_id', employeeId)
      .maybeSingle()
  ]);

  // Priority 1: Override
  if (override) {
    return {
      start: override.shift_start_time.substring(0, 5),
      end: override.shift_end_time.substring(0, 5),
      shiftType: 'flexible'
    };
  }

  // Priority 2: Permanent shift
  if (shift?.shift_type) {
    const shiftType = shift.shift_type as ShiftType;
    if (shiftType === 'morning' || shiftType === 'afternoon') {
      const def = SHIFT_DEFINITIONS[shiftType];
      return { start: def.start!, end: def.end!, shiftType };
    }
    if (shiftType === 'flexible') {
      return { ...DEFAULT_SHIFT, shiftType: 'flexible' };
    }
  }

  // Priority 3: Default
  return { ...DEFAULT_SHIFT, shiftType: 'default' };
}
```

### Change 2: useAttendance.ts - useCheckInByHRMS

```typescript
// Lines 176-193 - Run shift lookup and attendance check in parallel
const [shiftTimes, existingResult] = await Promise.all([
  getEmployeeShiftTimes(employee.id, today),
  supabase
    .from('attendance')
    .select('id, check_out')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .maybeSingle()
]);

const existing = existingResult.data;
```

### Change 3: useAttendance.ts - useCheckOutByHRMS

```typescript
// Lines 260-275 - Similar parallel optimization
const [attendanceResult, shiftTimes] = await Promise.all([
  supabase
    .from('attendance')
    .select('id, check_out, check_in, status')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .maybeSingle(),
  getEmployeeShiftTimes(employee.id, today)
]);

const attendance = attendanceResult.data;
```

### Change 4: AttendanceScanner.tsx

```typescript
// DELETE lines 79-81 (redundant polling)
// The useRealtimeAttendance() or realtime subscription handles updates
```

---

## Summary

This optimization plan reduces the check-in/out latency by approximately **50%** by:

1. ✅ Parallelizing shift override + permanent shift lookups
2. ✅ Parallelizing shift times + existing attendance checks
3. ✅ Removing redundant 30-second polling
4. ✅ Keeping realtime subscriptions for live updates

No UI changes are required - this is purely a backend/data-fetching optimization.
