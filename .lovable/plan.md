

## Plan: Add Date Filter to Attendance Appeals

### Current State

Both appeal views (`AttendanceAppealsView.tsx` and `AdminAppealsSection.tsx`) currently have:
- **Status filter** - Filter by Pending/Approved/Rejected
- **Employee filter** (AttendanceAppealsView only)
- **Search filter** (AdminAppealsSection only)

Neither view has a **date filter** for filtering appeals by date range.

---

### Solution

Add a date range filter to both appeal views, allowing HR/Admin to filter appeals by:
- Appeal date (the date the employee is requesting correction for)
- Preset options: Today, This Week, This Month, Custom Range

---

### Changes Required

#### 1. Update `AttendanceAppealsView.tsx`

**Add State:**
```typescript
const [dateFilter, setDateFilter] = useState<string>('all');
const [customDateRange, setCustomDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
```

**Add Filter UI:**
- Add a Select dropdown with preset date options (All Time, Today, This Week, This Month, Custom)
- When "Custom" is selected, show a date range picker using Popover + Calendar

**Update Filter Logic:**
```typescript
const filteredAppeals = appeals.filter(appeal => {
  const matchesStatus = statusFilter === 'all' || appeal.status === statusFilter;
  const matchesEmployee = employeeFilter === 'all' || appeal.employee_id === employeeFilter;
  
  // NEW: Date filter
  const appealDate = parseISO(appeal.appeal_date);
  let matchesDate = true;
  if (dateFilter === 'today') {
    matchesDate = isToday(appealDate);
  } else if (dateFilter === 'week') {
    matchesDate = isThisWeek(appealDate);
  } else if (dateFilter === 'month') {
    matchesDate = isThisMonth(appealDate);
  } else if (dateFilter === 'custom' && customDateRange.from) {
    matchesDate = appealDate >= customDateRange.from && 
                  (!customDateRange.to || appealDate <= customDateRange.to);
  }
  
  return matchesStatus && matchesEmployee && matchesDate;
});
```

---

#### 2. Update `AdminAppealsSection.tsx`

Same changes as above:
- Add date filter state
- Add date filter UI alongside existing status filter
- Update filter logic to include date matching

---

### UI Layout

**AttendanceAppealsView Filters (Updated):**
```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍] [Status ▼] [Employee ▼] [Date Range ▼] [📅 From] [📅 To]  │
└─────────────────────────────────────────────────────────────────┘
```

**AdminAppealsSection Filters (Updated):**
```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 Search...                ] [Status ▼] [Date Range ▼]       │
└─────────────────────────────────────────────────────────────────┘
(When Custom selected, show date pickers inline)
```

---

### Date Filter Options

| Option | Description |
|--------|-------------|
| All Time | No date filter (default) |
| Today | Appeals for today's date only |
| This Week | Appeals from current week (Monday-Sunday) |
| This Month | Appeals from current month |
| Custom Range | User selects From and To dates |

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/views/AttendanceAppealsView.tsx` | Add date filter state, UI (Select + Calendar popover), and filter logic |
| `src/components/admin/AdminAppealsSection.tsx` | Add date filter state, UI, and filter logic |

---

### Technical Implementation

**New Imports Needed:**
```typescript
import { isToday, isThisWeek, isThisMonth, startOfDay, endOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
```

**Custom Date Range UI:**
- Use Shadcn Popover with Calendar component
- Show "From" and "To" date pickers when "Custom" is selected
- Include `pointer-events-auto` class on Calendar for proper interaction

