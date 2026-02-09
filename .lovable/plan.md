

# Plan: Universal Employee Search Box

## Overview

Add a powerful search bar at the top of the main content area (above all views) that lets you quickly search for any employee and see a summary of all their related data -- attendance, leave requests, appeals, contracts, documents, etc. -- in a dropdown results panel.

## How It Will Work

1. A search input appears at the top of the main content area, always visible regardless of which view you're on
2. As you type an employee name or HRMS number, a dropdown shows matching employees
3. Clicking an employee opens their full profile modal (already exists: `EmployeeProfileModal`)
4. Each search result shows a quick summary: department, status, and key flags (pending leaves, recent appeals, attendance issues)

## Technical Details

### New Component: `src/components/UniversalSearchBar.tsx`

- Uses the existing `Command` (cmdk) component for keyboard-friendly search
- Queries the `employees` table client-side (already loaded via `useEmployees`)
- Also fetches summary counts from `attendance`, `leave_records`, `attendance_appeals` for matched employees
- Search filters by: `full_name`, `hrms_no`, `department`, `job_position`, `work_email`
- Results grouped by relevance with employee photo/avatar, name, HRMS number, department
- Each result shows badges: pending leave count, recent appeals, attendance status today
- Clicking a result opens `EmployeeProfileModal` with that employee selected
- Keyboard shortcut: `Ctrl+K` / `Cmd+K` to focus the search

### Modified File: `src/pages/Index.tsx`

- Import and render `UniversalSearchBar` above `{renderView()}` inside the `<main>` element
- Pass a callback to open the employee profile modal

### Data Strategy

- Employees list is already cached via React Query (`useEmployees`)
- Search filtering happens client-side for instant results (no extra API calls while typing)
- Summary badges (leave, appeals, attendance) fetched once on component mount and cached
- No new database tables or migrations needed

### Component Structure

```
Index.tsx
  +-- UniversalSearchBar (new)
  |     +-- Search Input (Ctrl+K shortcut)
  |     +-- Dropdown Results (cmdk Command component)
  |           +-- Employee cards with summary badges
  |           +-- Click -> opens EmployeeProfileModal
  +-- {renderView()} (existing)
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/UniversalSearchBar.tsx` | **Create** -- search component with cmdk |
| `src/pages/Index.tsx` | **Modify** -- add search bar above view content |

## No Database Changes Required

All data is already available through existing hooks and tables.

