
## Plan: Fix Edge Functions for Employee Account Management

### Problem Identified

Both `reset-employee-account` and `update-employee-email` edge functions are failing with 401 Unauthorized errors because they use a non-existent Supabase Auth method.

**Current Code Issue:**
```typescript
// Lines 37-44 in reset-employee-account/index.ts
const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
```

`getClaims(token)` is NOT a valid Supabase Auth method. The correct method is `getUser()`.

**Auth Logs Evidence:**
```
Session not found
session id (b88556aa-8c41-403c-a223-4dad2c640f14) doesn't exist
```

---

### Solution

Update both edge functions to use the proper `auth.getUser()` method, matching the working pattern in `create-employee-account/index.ts` and `reset-user-password/index.ts`.

---

### Files to Modify

| File | Action |
|------|--------|
| `supabase/functions/reset-employee-account/index.ts` | Replace `getClaims()` with `getUser()` |
| `supabase/functions/update-employee-email/index.ts` | Replace `getClaims()` with `getUser()` |

---

### Changes for `reset-employee-account/index.ts`

**Before (Lines 32-46):**
```typescript
const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});

// Verify caller is authenticated
const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const callerId = claimsData.claims.sub;
```

**After:**
```typescript
const userClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});

// Verify caller is authenticated
const { data: { user: callingUser }, error: userError } = await userClient.auth.getUser();
if (userError || !callingUser) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const callerId = callingUser.id;
```

---

### Changes for `update-employee-email/index.ts`

**Before (Lines 33-47):**
```typescript
const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});

// Verify caller is authenticated
const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const callerId = claimsData.claims.sub;
```

**After:**
```typescript
const userClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});

// Verify caller is authenticated
const { data: { user: callingUser }, error: userError } = await userClient.auth.getUser();
if (userError || !callingUser) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const callerId = callingUser.id;
```

---

### Summary of Changes

| Edge Function | Issue | Fix |
|--------------|-------|-----|
| `reset-employee-account` | Uses non-existent `getClaims(token)` | Replace with `getUser()` |
| `update-employee-email` | Uses non-existent `getClaims(token)` | Replace with `getUser()` |
| `create-employee-account` | Already uses `getUser()` correctly | No changes needed |

---

### Technical Notes

- `auth.getUser()` is the standard Supabase method for verifying JWT tokens in Edge Functions
- It validates the token against the Supabase Auth server and returns the user object
- The user ID is accessed via `callingUser.id` instead of `claimsData.claims.sub`
- This matches the working pattern in `reset-user-password/index.ts` which successfully verifies admin users

---

### Testing After Implementation

After deploying the fixed edge functions:
1. Log into the Admin Dashboard
2. Navigate to User Accounts section
3. Try to reset an employee's account via the Edit Employee modal
4. Try to generate a new employee account
5. Both operations should now work without 401 errors
