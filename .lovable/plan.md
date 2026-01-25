
## Plan: Fix Employee Email Change → Auth Account Sync Issue

### Problem Identified

**Current State (Renz Vincent S. Aclan):**
| Field | Value |
|-------|-------|
| Employee `work_email` | `aclanrenz1@gmail.com` (NEW) |
| Profile `email` (Auth) | `aclanrenzvincent91@gmail.com` (OLD) |
| `user_id` | `60a3ed28-e7b2-4c06-ae47-f2ab3bba8e09` |

**Root Cause**: When an employee's `work_email` is changed in the Edit Employee modal, it only updates the `employees` table. The linked Auth user account (`auth.users`) and the `profiles` table remain unchanged.

**Impact**:
1. Employee still logs in with OLD email
2. Admin User Accounts section shows OLD email (from `profiles` table)
3. Mismatch creates confusion for HR and employees

---

### Solution Overview

Implement a two-part solution:

1. **Create Edge Function**: `update-employee-email` - Updates both Auth user email and profiles table when work_email changes
2. **Modify Edit Flow**: Detect email changes and prompt admin to choose:
   - **Option A**: Update the Auth account email (sync emails)
   - **Option B**: Unlink and recreate account (reset account with new email)
3. **Add Email Mismatch Detection**: Show warning in Admin User Accounts when employee email differs from auth email

---

### Part 1: New Edge Function `update-employee-email`

**File: `supabase/functions/update-employee-email/index.ts`**

This function will:
1. Accept employee ID and new email
2. Verify caller is HR or Admin
3. Check if employee has a linked user account (`user_id`)
4. Update the Auth user's email using `supabase.auth.admin.updateUserById()`
5. Update the `profiles` table email
6. Return success/error

```typescript
// Key operations:
await adminClient.auth.admin.updateUserById(user_id, {
  email: newEmail,
  email_confirm: true  // Auto-confirm to avoid verification email
});

await adminClient.from('profiles')
  .update({ email: newEmail })
  .eq('id', user_id);
```

---

### Part 2: Create "Reset Employee Account" Function

**New Edge Function: `reset-employee-account`**

For cases where email change requires account reset:
1. Delete existing Auth user (if exists)
2. Remove `user_id` from employee record
3. Remove `employee` role from `user_roles`
4. This allows the "Generate Account" button to reappear

```typescript
// Steps:
1. Get employee's user_id
2. Delete from auth.users using adminClient.auth.admin.deleteUser(userId)
3. Update employee: set user_id = null
4. Delete from user_roles where user_id = userId and role = 'employee'
```

---

### Part 3: Update Edit Employee Modal

**File: `src/components/modals/EditEmployeeModal.tsx`**

Add detection for email changes when employee has an existing account:

1. Compare `formData.work_email` with original `employee.work_email`
2. If changed AND `employee.user_id` exists, show confirmation dialog
3. Offer two options:
   - **"Sync Email"**: Call `update-employee-email` edge function
   - **"Reset Account"**: Call `reset-employee-account` edge function (unlinks account, allows regeneration)

```text
┌──────────────────────────────────────────────────────┐
│ ⚠️ Email Change Detected                            │
├──────────────────────────────────────────────────────┤
│ This employee has a login account linked to:        │
│ OLD: aclanrenzvincent91@gmail.com                   │
│ NEW: aclanrenz1@gmail.com                           │
│                                                      │
│ How would you like to proceed?                       │
│                                                      │
│ [Sync Email] - Update the login email to match      │
│ [Reset Account] - Unlink and regenerate account     │
│ [Skip] - Only update employee record, keep old login│
└──────────────────────────────────────────────────────┘
```

---

### Part 4: Add Email Mismatch Warning in Admin User Accounts

**File: `src/components/admin/AdminUserAccountsSection.tsx`**

When displaying users, compare auth email with linked employee's work_email and show warning badge:

```typescript
// In the query function, add employee work_email to the join
const linkedEmployee = (employeesData || []).find((e) => e.user_id === profile.id);

return {
  ...
  linked_employee_email: linkedEmployee?.work_email || null,
  email_mismatch: linkedEmployee && 
    linkedEmployee.work_email?.toLowerCase() !== profile.email?.toLowerCase()
};
```

Display warning in table:
```text
│ User                  │ Roles    │ Linked Employee        │
│ old@email.com         │ employee │ Renz Vincent (⚠️ Email │
│                       │          │ mismatch!)             │
```

---

### Part 5: Immediate Fix for Renz

After implementing the above, call the edge function to sync Renz's account:

```sql
-- Current state:
-- Employee work_email: aclanrenz1@gmail.com
-- Auth/Profile email: aclanrenzvincent91@gmail.com

-- Options:
-- 1. Sync: Update auth.users and profiles.email to aclanrenz1@gmail.com
-- 2. Reset: Delete auth user, set employee.user_id = null, regenerate account
```

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/update-employee-email/index.ts` | **CREATE** | Edge function to sync auth email with employee email |
| `supabase/functions/reset-employee-account/index.ts` | **CREATE** | Edge function to unlink/delete employee auth account |
| `supabase/config.toml` | **MODIFY** | Register new edge functions |
| `src/components/modals/EditEmployeeModal.tsx` | **MODIFY** | Add email change detection and confirmation dialog |
| `src/components/admin/AdminUserAccountsSection.tsx` | **MODIFY** | Add email mismatch detection and warning display |
| `src/hooks/useEmployees.ts` | **MODIFY** | Add hooks for email sync and account reset |

---

### Edge Function: `update-employee-email`

```typescript
// Endpoint: POST /functions/v1/update-employee-email
// Body: { employeeId: string, newEmail: string }

// Flow:
1. Verify caller is HR/Admin
2. Fetch employee to get user_id
3. If no user_id, return "No account to update"
4. Update auth.users email via adminClient.auth.admin.updateUserById()
5. Update profiles.email
6. Return success

// Security: Uses service role key internally
// Authorization: Requires HR or Admin role
```

---

### Edge Function: `reset-employee-account`

```typescript
// Endpoint: POST /functions/v1/reset-employee-account
// Body: { employeeId: string }

// Flow:
1. Verify caller is HR/Admin
2. Fetch employee to get user_id
3. If no user_id, return "No account to reset"
4. Delete user from auth.users
5. Update employee: set user_id = null
6. Delete from user_roles
7. Return success

// After reset: Admin can use "Generate Account" button with new email
```

---

### UI Flow After Implementation

**Scenario: HR changes Renz's email from old@email.com to new@email.com**

1. HR opens Edit Employee modal
2. Changes work_email field
3. Clicks Save
4. System detects:
   - Email changed ✓
   - Employee has linked account ✓
5. Confirmation dialog appears with options
6. HR selects "Sync Email"
7. Edge function updates:
   - `auth.users.email` → new@email.com
   - `profiles.email` → new@email.com
8. Success toast: "Email synced successfully"
9. Admin User Accounts now shows correct email

---

### Summary

| Issue | Solution |
|-------|----------|
| Email mismatch not detected | Add comparison in EditEmployeeModal |
| Auth email not updated | New `update-employee-email` edge function |
| Can't regenerate account | New `reset-employee-account` edge function |
| No visibility of mismatches | Warning badge in Admin User Accounts |
| Renz's specific issue | Can be fixed immediately after implementation |
