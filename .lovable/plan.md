

# Plan: Compact Appeal List View with Scrollbar

## Overview

Transform the current Appeals List from a spacious card-based layout to a compact, table-like list view that displays all essential details while saving vertical space. Add a scrollable container to handle long lists efficiently.

---

## Current Issues

1. **Excessive vertical space** - Each appeal card takes 4-5 lines of height with generous padding
2. **No scroll containment** - The entire page scrolls when many appeals exist
3. **Inconsistent density** - Information is spread out, making it hard to scan quickly

---

## Solution Design

### Compact List Row Layout

Each appeal will be displayed as a compact horizontal row with:

```text
+----------------------------------------------------------------------------------------------------------+
| [Avatar] Name         | Date        | Time Request       | Message (truncated) | Status  | Action     |
+----------------------------------------------------------------------------------------------------------+
| [Photo] John Doe      | 28 Jan 2026 | 08:00 → 17:00      | "I forgot to..."    | Pending | [Review]   |
+----------------------------------------------------------------------------------------------------------+
```

### Key Features

- **Single-line per appeal** with all essential info visible at a glance
- **Fixed-height scrollable container** (max 400-500px) with custom scrollbar
- **Hover state** for pending items to indicate they're clickable
- **Compact avatar** (28x28px instead of 40x40px)
- **Inline time display** formatted as "HH:mm → HH:mm"
- **Truncated message** with ellipsis (visible on hover via tooltip)

---

## Files to Modify

### `src/components/views/AttendanceAppealsView.tsx`

**Changes:**

1. **Add ScrollArea import:**
```typescript
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
```

2. **Wrap Appeals List with ScrollArea:**
```typescript
<ScrollArea className="h-[400px]">
  {/* Appeals rows go here */}
</ScrollArea>
```

3. **Replace current card layout with compact table-like rows:**

**Current (lines 305-369):**
```typescript
<div className="space-y-3">
  {filteredAppeals.map((appeal) => {
    // ... full card layout with stacked content
  })}
</div>
```

**New compact layout:**
```typescript
<div className="space-y-1">
  {filteredAppeals.map((appeal) => (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border ...">
      {/* Compact avatar (28x28) */}
      {/* Employee name - fixed width */}
      {/* Date - fixed width */}
      {/* Time request - fixed width */}
      {/* Message - truncated with tooltip */}
      {/* Status badge - compact */}
      {/* Review button for pending */}
    </div>
  ))}
</div>
```

---

## Detailed UI Changes

### Row Structure

| Element | Width | Content |
|---------|-------|---------|
| Avatar | 28px | Employee photo or initials |
| Name | ~120px | Employee full name (truncated if needed) |
| Date | ~90px | "28 Jan 2026" |
| Time | ~110px | "08:00 → 17:00" or "N/A" |
| Message | flex-1 | Truncated message with tooltip |
| Status | ~80px | Compact badge |
| Action | ~70px | "Review" button (pending only) |

### Visual Styling

- **Pending rows:** Subtle amber background (`bg-amber-500/5`), left border accent
- **Approved rows:** Green tint (`bg-green-500/5`)
- **Rejected rows:** Red tint (`bg-red-500/5`)
- **Row height:** ~44px (compact but readable)
- **Spacing between rows:** 4px (`space-y-1`)

### Scroll Container

```typescript
<ScrollArea className="h-[420px] pr-2">
  {/* Compact list rows */}
</ScrollArea>
```

- Fixed height of 420px (shows ~9-10 rows before scrolling)
- Visible scrollbar when content overflows
- Smooth scroll behavior

---

## Implementation Details

### Compact Row Component

```typescript
<div
  key={appeal.id}
  onClick={() => appeal.status === 'Pending' && setSelectedAppeal(appeal)}
  className={cn(
    "flex items-center gap-3 px-3 py-2 rounded-md border-l-2 transition-all",
    appeal.status === 'Pending' 
      ? "bg-amber-500/5 border-l-amber-500 cursor-pointer hover:bg-amber-500/10" 
      : appeal.status === 'Approved'
      ? "bg-green-500/5 border-l-green-500"
      : "bg-red-500/5 border-l-red-500"
  )}
>
  {/* Compact Avatar */}
  <div className="flex-shrink-0">
    {employeePhoto ? (
      <img src={employeePhoto} className="w-7 h-7 rounded-full object-cover" />
    ) : (
      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
        <User className="w-3.5 h-3.5 text-primary" />
      </div>
    )}
  </div>

  {/* Name */}
  <div className="w-28 truncate text-sm font-medium">{employeeName}</div>

  {/* Date */}
  <div className="w-24 text-xs text-muted-foreground">
    {format(parseISO(appeal.appeal_date), 'dd MMM yyyy')}
  </div>

  {/* Time Request */}
  <div className="w-28 text-xs">
    {appeal.requested_check_in || 'N/A'} → {appeal.requested_check_out || 'N/A'}
  </div>

  {/* Message with Tooltip */}
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex-1 text-xs text-muted-foreground truncate">
          {appeal.appeal_message}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{appeal.appeal_message}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {/* Status Badge - Compact */}
  <Badge className={cn("text-xs px-2 py-0.5", statusStyles)}>
    {appeal.status}
  </Badge>

  {/* Review Button (pending only) */}
  {appeal.status === 'Pending' && (
    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
      Review
    </Button>
  )}
</div>
```

---

## Additional Enhancements

1. **Column Headers** - Add a sticky header row above the list:
```typescript
<div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b mb-1">
  <div className="w-7" /> {/* Avatar space */}
  <div className="w-28">Employee</div>
  <div className="w-24">Date</div>
  <div className="w-28">Time Request</div>
  <div className="flex-1">Message</div>
  <div className="w-16">Status</div>
  <div className="w-16">Action</div>
</div>
```

2. **Reviewed Info on Hover** - For approved/rejected items, show reviewer info in tooltip

3. **Empty State** - Keep current empty state but adjust for compact layout

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| Appeals List Container | Wrap with `ScrollArea` (height: 420px) |
| Individual Appeal Items | Convert from cards to compact single-line rows |
| Avatar Size | Reduce from 40x40px to 28x28px |
| Padding | Reduce from `p-4` to `px-3 py-2` |
| Message Display | Truncate with ellipsis, full text in tooltip |
| Row Spacing | Reduce from `space-y-3` to `space-y-1` |
| Visual Indicators | Add left border accent for status |
| Column Headers | Add sticky header row for clarity |

---

## Expected Result

- **Before:** ~5-6 appeals visible before scrolling page
- **After:** ~9-10 appeals visible in compact scrollable container
- **Benefit:** HR can quickly scan and process multiple appeals without excessive scrolling
- **UX:** Clear visual hierarchy, all important info at a glance, smooth scrolling experience

