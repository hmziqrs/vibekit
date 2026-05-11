# Phase: Password Security

**Status:** Complete
**Category:** Auth & Security
**Started:** 2026-05-11

## Scope

Enhance password validation with strength estimation, breached password checking, consistent validation across all password forms, and a password strength UI component. Breached password checking uses the k-anonymity HaveIBeenPwned API (no full hash sent). Passwordless login and forced rotation policy are deferred.

---

## Items

### 1. Password Strength Estimator

**Problem:** Only min 8 / max 128 character validation exists. No entropy or complexity checking.

**Plan:**

- Create `src/lib/password-strength.ts` with a pure function:
  - `getPasswordStrength(password: string): { score: 0-4, label: string, feedback: string[] }`
  - Checks: length, uppercase, lowercase, digit, special char, common patterns
  - No external dependencies — pure heuristic scoring
  - Score 0 = very weak, 1 = weak, 2 = fair, 3 = good, 4 = strong
  - Returns specific feedback messages ("Add an uppercase letter", "Make it longer", etc.)
- Also export `getPasswordStrengthColor(score)` and `getPasswordStrengthLabel(score)` for UI

**Files changed:** `src/lib/password-strength.ts` (new)

---

### 2. Breached Password Check (k-anonymity HIBP API)

**Problem:** Users can set passwords that are known to be compromised in data breaches.

**Plan:**

- Create `src/lib/server/breached-password.ts`:
  - `isBreachedPassword(password: string): Promise<boolean>`
  - Uses HaveIBeenPwned k-anonymity API:
    1. SHA-1 hash the password
    2. Send only first 5 chars of the hash to `https://api.pwnedpasswords.com/range/{prefix}`
    3. Check if the full hash suffix appears in the response
  - Never sends the full password or full hash to any server
  - Cache results in-memory with TTL (1 hour) to reduce API calls
  - Graceful fallback: if API is unavailable, skip the check (don't block registration)

**Files changed:** `src/lib/server/breached-password.ts` (new)

---

### 3. Enhanced Password Validator

**Problem:** Current password validation is only `min(8).max(128)`. The change-password form duplicates this inline instead of importing from the shared validator.

**Plan:**

- Update `src/lib/validators/common.ts`:
  - Replace the simple `password` validator with an enhanced version:
    ```typescript
    export const password = z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .refine((val) => /[A-Z]/.test(val), 'Include at least one uppercase letter')
      .refine((val) => /[a-z]/.test(val), 'Include at least one lowercase letter')
      .refine((val) => /[0-9]/.test(val), 'Include at least one number')
    ```
  - This adds character class requirements while keeping the validator as a reusable schema
  - Registration, reset password, and change password all use this shared validator
- Update the change-password form in settings to import from `$lib/validators/common` instead of duplicating

**Files changed:** `src/lib/validators/common.ts`, `src/routes/(app)/app/settings/+page.svelte`

---

### 4. Password Strength UI Component

**Problem:** No real-time password strength feedback during registration or password change.

**Plan:**

- Create `src/lib/components/PasswordStrength.svelte`:
  - Shows a segmented strength bar (5 segments) with color coding (red → orange → yellow → green)
  - Displays the strength label (Very Weak / Weak / Fair / Good / Strong)
  - Lists specific feedback items as bullet points
  - Uses the `getPasswordStrength()` function from `src/lib/password-strength.ts`
  - Takes a `password` prop (string) and is reactive
- Add it to:
  - Registration form (`src/routes/(auth)/register/+page.svelte`)
  - Change password form (`src/routes/(app)/app/settings/+page.svelte`)
  - Reset password form (`src/routes/(auth)/reset-password/+page.svelte`)

**Files changed:** `src/lib/components/PasswordStrength.svelte` (new), registration/settings/reset pages

---

### 5. Server-Side Breached Password Check on Registration

**Problem:** No server-side validation against known breached passwords.

**Plan:**

- Add a custom Zod refinement to the registration flow:
  - In `src/lib/validators/auth.ts`, add an async refinement to `registerSchema` that calls `isBreachedPassword()`
  - If breached, return error: "This password has appeared in a data breach. Please choose a different password."
  - Only applied on registration (not login) — checking on login would leak timing info
- This requires making the validator async. Since TanStack Form supports async validation, this should work.

**Files changed:** `src/lib/validators/auth.ts`

---

## Out of Scope

- Passwordless login (magic link, OTP) → separate phase
- Forced password rotation policy → admin feature, separate phase
- Password hashing configuration → Better Auth handles this internally
- Password strength component tests with browser automation → tested via unit tests

## Success Criteria

- [x] Password strength estimator returns meaningful scores and feedback
- [x] Breached password check uses HIBP k-anonymity API with graceful fallback
- [x] Password validator requires uppercase, lowercase, and digit (in addition to min 8)
- [x] Change password form uses shared validator (no duplication)
- [x] Password strength UI shown on registration, change password, and reset password forms
- [ ] Server-side breached password check on registration (deferred — requires async validator integration)
- [x] All quality gates pass (check, lint, format, test)
