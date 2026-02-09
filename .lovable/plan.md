

# Plan: Skip Weekend Email Reports and Fix Punch-Out-Only Absent Logic

## Problems Found

### Problem 1: No Weekend Check
Both `send-absent-notification` and `send-daily-summary` edge functions run every day, including Saturday and Sunday. They should skip sending on weekend days based on company settings (default: work week Monday-Friday, so Saturday and Sunday are off).

### Problem 2: Punch-Out-Only Employees Marked Absent
In `send-absent-notification`, the absent check (line 86-89) only looks at `check_in`:
```
filter(a => a.check_in !== null)
```
If an employee only punched out (e.g., missed punch-in but has a checkout record), they have an attendance record with `check_out` but `check_in = NULL`. The current logic treats them as absent, which is incorrect -- they were present at the office.

The same issue exists in `send-daily-summary` where `absentCount` is calculated as `totalEmployees - (presentCount + lateCount)`, ignoring employees who have attendance records with statuses like "Miss Punch In" or "Undertime".

---

## Technical Changes

### File 1: `supabase/functions/send-absent-notification/index.ts`

**Add weekend check (after line 50):**
- Fetch `company_settings` to get `work_week_start` and `work_week_end`
- Calculate weekend days using the same logic as `workWeekUtils.ts`
- If today is a weekend day, return early with a "Skipped: weekend" response

**Fix absent logic (lines 86-89):**
- Change from checking only `check_in !== null` to checking if any attendance record exists for the employee (whether `check_in` or `check_out` is present)
- This ensures employees who only punched out are NOT counted as absent

### File 2: `supabase/functions/send-daily-summary/index.ts`

**Add weekend check (after line 23):**
- Same weekend detection logic as above
- Return early on weekends

**Fix absent calculation (lines 57-61):**
- Include employees with any attendance record (not just Present/Late) in the "not absent" count
- Employees with statuses like "Miss Punch In", "Undertime", "Missed Punch" should not be counted as absent

---

## Implementation Details

### Weekend Detection Logic (inline in each function)

```typescript
// Fetch company settings for work week
const { data: companySettings } = await supabase
  .from('company_settings')
  .select('work_week_start, work_week_end')
  .limit(1)
  .single();

const workWeekStart = companySettings?.work_week_start || 'Monday';
const workWeekEnd = companySettings?.work_week_end || 'Friday';

// Calculate weekend days (same logic as workWeekUtils.ts)
const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const startIdx = dayNames.indexOf(workWeekStart);
const endIdx = dayNames.indexOf(workWeekEnd);

const workingDays: number[] = [];
let current = startIdx;
for (let i = 0; i < 7; i++) {
  workingDays.push(current);
  if (current === endIdx) break;
  current = (current + 1) % 7;
}
const weekendDays = [0,1,2,3,4,5,6].filter(d => !workingDays.includes(d));

// Get today's day of week in UAE timezone
const todayDate = new Date(todayStr + 'T00:00:00+04:00');
const todayDayOfWeek = todayDate.getDay();

if (weekendDays.includes(todayDayOfWeek)) {
  console.log(`Today is a weekend day. Skipping email report.`);
  return new Response(JSON.stringify({ 
    message: "Skipped: weekend day", skipped: true 
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
```

### Fix Absent Logic in send-absent-notification

**Before (line 86-89):**
```typescript
const checkedInEmployees = new Set(
  (attendance || [])
    .filter(a => a.check_in !== null)
    .map(a => a.employee_id)
);
```

**After:**
```typescript
// Include employees who have ANY attendance record (check_in OR check_out)
const employeesWithAttendance = new Set(
  (attendance || [])
    .filter(a => a.check_in !== null || a.check_out !== null)
    .map(a => a.employee_id)
);
```

Then update the reference from `checkedInEmployees` to `employeesWithAttendance` on line 147.

### Fix Absent Count in send-daily-summary

**Before (lines 57-61):**
```typescript
const presentCount = attendanceData?.filter(a => a.status === 'Present' || a.status === 'Appealed').length || 0;
const lateCount = attendanceData?.filter(a => a.status === 'Late').length || 0;
const absentCount = totalEmployees - (presentCount + lateCount);
```

**After:**
```typescript
const presentCount = attendanceData?.filter(a => a.status === 'Present' || a.status === 'Appealed').length || 0;
const lateCount = attendanceData?.filter(a => a.status === 'Late').length || 0;
// Count ALL employees with any attendance record (regardless of status)
const employeesWithRecords = new Set(
  (attendanceData || []).map(a => a.employee_id)
).size;
const absentCount = totalEmployees - employeesWithRecords;
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `send-absent-notification/index.ts` | Add weekend skip logic; fix absent detection to include punch-out-only employees |
| `send-daily-summary/index.ts` | Add weekend skip logic; fix absent count to exclude employees with any attendance record |

---

## Expected Outcome

| Scenario | Before | After |
|----------|--------|-------|
| Saturday/Sunday report | Sends email | Skips with "weekend" message |
| Employee with only check_out | Marked Absent | NOT marked Absent |
| Employee with Miss Punch In status | Marked Absent (in summary) | NOT marked Absent |
| Normal weekday, no attendance | Marked Absent | Marked Absent (correct) |
