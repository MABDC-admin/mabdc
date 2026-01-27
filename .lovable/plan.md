

# Plan: Convert All Timestamps to UAE Time (UTC+4)

## Problem Identified

The system currently uses UTC or server default timezone for datetime formatting in edge functions. Several functions have inconsistent timezone handling:

| Function | Current Behavior | Issue |
|----------|------------------|-------|
| `send-leave-request-notification` | No timezone specified in `formatDateTime()` | Shows UTC time |
| `send-appeal-request-notification` | No timezone specified in `formatDateTime()` | Shows UTC time |
| `send-leave-decision-notification` | No timezone specified in `formatDateTime()` | Shows UTC time |
| `send-appeal-decision-notification` | No timezone specified in `formatDateTime()` | Shows UTC time |
| `send-late-notification` | ✅ Already uses `Asia/Dubai` | Correct |
| `send-daily-summary` | ✅ Already uses `Asia/Dubai` | Correct |
| `send-absent-notification` | Uses manual UTC+4 offset | Works but inconsistent approach |

---

## Solution: Add `timeZone: 'Asia/Dubai'` to All Date Formatters

### Files to Update

### 1. `supabase/functions/send-leave-request-notification/index.ts`

**Update `formatDate` (Lines 16-23):**
```typescript
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    timeZone: 'Asia/Dubai',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}
```

**Update `formatDateTime` (Lines 25-35):**
```typescript
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { 
    timeZone: 'Asia/Dubai',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
```

---

### 2. `supabase/functions/send-appeal-request-notification/index.ts`

**Update `formatDate` (Lines 16-23):**
```typescript
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    timeZone: 'Asia/Dubai',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}
```

**Update `formatDateTime` (Lines 35-45):**
```typescript
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { 
    timeZone: 'Asia/Dubai',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
```

---

### 3. `supabase/functions/send-leave-decision-notification/index.ts`

**Update `formatDate` (Lines 18-25):**
```typescript
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    timeZone: 'Asia/Dubai',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}
```

**Update `formatDateTime` (Lines 27-37):**
```typescript
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { 
    timeZone: 'Asia/Dubai',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
```

---

### 4. `supabase/functions/send-appeal-decision-notification/index.ts`

**Update `formatDate` (Lines 18-25):**
```typescript
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    timeZone: 'Asia/Dubai',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}
```

**Update `formatDateTime` (Lines 27-37):**
```typescript
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { 
    timeZone: 'Asia/Dubai',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
```

---

### 5. `supabase/functions/send-absent-notification/index.ts`

**Simplify UAE date calculation (Lines 49-53):**

Current complex approach:
```typescript
const now = new Date();
const uaeOffset = 4 * 60; // UAE is UTC+4
const uaeTime = new Date(now.getTime() + (uaeOffset + now.getTimezoneOffset()) * 60000);
const todayStr = uaeTime.toISOString().split('T')[0];
```

Simplified to:
```typescript
const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
```

---

## Files Summary

| File | Changes |
|------|---------|
| `supabase/functions/send-leave-request-notification/index.ts` | Add `timeZone: 'Asia/Dubai'` to `formatDate` and `formatDateTime` |
| `supabase/functions/send-appeal-request-notification/index.ts` | Add `timeZone: 'Asia/Dubai'` to `formatDate` and `formatDateTime` |
| `supabase/functions/send-leave-decision-notification/index.ts` | Add `timeZone: 'Asia/Dubai'` to `formatDate` and `formatDateTime` |
| `supabase/functions/send-appeal-decision-notification/index.ts` | Add `timeZone: 'Asia/Dubai'` to `formatDate` and `formatDateTime` |
| `supabase/functions/send-absent-notification/index.ts` | Simplify UAE date calculation to use `toLocaleDateString` with timezone |

---

## Before vs After Example

**UTC (Before):**
- Submitted: Jan 26, 2026, 6:30 PM ← Actually 10:30 PM in UAE

**UAE Time (After):**
- Submitted: Jan 26, 2026, 10:30 PM ← Correct UAE time

---

## Technical Note

The `timeZone: 'Asia/Dubai'` option in JavaScript's `toLocaleString()` and `toLocaleDateString()` methods tells the formatter to convert the UTC timestamp to UAE local time (UTC+4) before displaying. This is the standard approach used in `send-late-notification` and `send-daily-summary` which are already working correctly.

