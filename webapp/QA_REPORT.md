# TeamDX Lead Manager – QA Report

**Date:** March 6, 2025  
**Scope:** Full diagnostic – security, bugs, UX, performance, accessibility

---

## Critical Issues

### 1. Security: Telecaller can mark ANY lead as invalid/review/hidden

**Location:** `src/app/api/leads/route.ts` (PATCH), `src/lib/db.ts`

**Problem:** `markLeadInvalid`, `markLeadForReview`, `markLeadHiddenForAdmin` use `createAdminClient()` which bypasses RLS. The API does **not** verify that the lead belongs to the user before calling these. A telecaller can send:

```json
PATCH /api/leads
{ "id": "<any-lead-id>", "moveToAdmin": true }
```

and mark another telecaller's lead as invalid.

**Fix:** Before calling these functions, verify `assigned_to === user.email` (or allow only for admins). Fetch the lead first and check ownership.

---

### 2. Security: Telecaller can assign leads to others via POST

**Location:** `src/app/api/leads/route.ts` (POST)

**Problem:** `assigned_to: assignedTo ?? user.email` – any authenticated user can send `assignedTo: "other@user.com"` and create leads for other users. Typically only admins should assign leads.

**Fix:** For non-admin users, ignore `assignedTo` and always use `user.email`:

```ts
const assigned_to = userIsAdmin ? (assignedTo ?? user.email) : user.email;
```

---

### 3. ESLint config broken

**Location:** `webapp/eslint.config.mjs`

**Error:** `Package subpath './config' is not defined by exports` – ESLint 8 doesn't support `eslint/config` (flat config).

**Fix:** Either:
- Use `.eslintrc.json` with `extends: ["next/core-web-vitals"]`, or
- Upgrade to ESLint 9 and use flat config.

---

## High Priority Issues

### 4. CSV parsing: comma inside quoted values breaks parsing

**Location:** `src/app/api/leads/fetch-from-sheet/route.ts`, `src/app/dashboard/leads/page.tsx` (parseCsv)

**Problem:** Simple `line.split(",")` fails when a cell contains:
```
"John, Jr.", Mumbai, 9876543210
```

**Fix:** Use a proper CSV parser (e.g. `papaparse` or regex for quoted fields).

---

### 5. No ownership check before update in PATCH

**Location:** `src/app/api/leads/route.ts` (PATCH)

**Problem:** `updateLead` uses RLS so it will fail for other users' leads. But `markLeadInvalid`, `markLeadForReview`, `markLeadHiddenForAdmin` bypass RLS. So we have inconsistent behavior – some actions are protected, others are not.

**Fix:** Add explicit ownership check for all PATCH actions that use admin client.

---

### 6. Google Sheet fetch: no rate limiting / timeout

**Location:** `src/app/api/leads/fetch-from-sheet/route.ts`

**Problem:** No timeout on `fetch(exportUrl)`. Large sheets or slow networks can hang the request.

**Fix:** Add `AbortController` with timeout (e.g. 15s):

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);
const res = await fetch(exportUrl, { signal: controller.signal, ... });
clearTimeout(timeout);
```

---

### 7. Admin users list: 1000 limit

**Location:** `src/app/api/admin/users/route.ts`

**Problem:** `listUsers({ perPage: 1000 })` – if you have more than 1000 users, some won't appear.

**Fix:** Paginate or increase limit; handle pagination in UI if needed.

---

## Medium Priority Issues

### 8. GET /api/leads: redundant condition

**Location:** `src/app/api/leads/route.ts` line 36

```ts
if (admin || (admin && review)) {
```

`(admin && review)` is redundant when `admin` is already checked. Simpler: `if (admin)`.

---

### 9. markLeadDocumentReceived: no ownership check

**Location:** `src/lib/db.ts` – `markLeadDocumentReceived` uses `createClient()` (RLS)

**Status:** RLS enforces `assigned_to = auth.jwt()->>'email'` for update. So this is safe. No change needed.

---

### 10. Missing error handling in API responses

**Location:** Many API routes

**Problem:** Some `fetch` calls in components don't check `res.ok` before `res.json()`. Errors may show as generic "Failed to fetch" or parse errors.

**Fix:** Consistently check `if (!res.ok)` and handle error body (e.g. `data.error`).

---

### 11. Logout button: no `type="button"`

**Location:** `src/components/DashboardShell.tsx` line 99

**Problem:** Logout button inside `<header>` – if it's inside a form by accident, it could submit. Add `type="button"` for safety.

---

### 12. Refresh button: full page reload

**Location:** `src/components/DashboardShell.tsx` line 89

**Problem:** `window.location.reload()` – loses client state and causes full reload. Consider using router refresh or a data refetch instead.

---

## Low Priority / Improvements

### 13. Accessibility

- **Good:** `aria-label` on buttons (LoginForm, LeadTable, modals), `role="dialog"` on LeadDetailModal.
- **Improve:** Add `aria-live` for dynamic content (e.g. validation results).
- **Improve:** Ensure modals trap focus and restore on close.

---

### 14. Loading states

- **Good:** Loading states on LoginForm, create-user flow.
- **Improve:** Skeleton loaders for LeadTable, AdminLeadsTable when fetching.

---

### 15. No input validation on phone numbers

**Location:** `src/lib/whatsapp.ts` – `getWaChatUrl`

**Problem:** Assumes 10-digit Indian numbers get `91` prefix. Non-Indian numbers might not work correctly.

**Improve:** Add optional country code config or detect from format.

---

### 16. Overdue API: N+1 updates

**Location:** `src/app/api/overdue/route.ts`

**Problem:** Loops over leads and calls `markOverdue` for each – N DB round-trips.

**Improve:** Batch update with `in("id", overdueIds)`.

---

### 17. npm audit: 4 vulnerabilities

**From build:** 3 high, 1 critical. Run `npm audit` and fix where possible.

---

### 18. Build cache: Next.js warning

**Message:** "No build cache found. Please configure build caching for faster rebuilds."

**Improve:** Add build cache in `next.config.js` or CI (Render) for faster deploys.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High     | 4 |
| Medium   | 5 |
| Low      | 6 |

**Recommended order of fixes:**
1. Critical #1 – Ownership check for moveToAdmin/Review/Hidden
2. Critical #2 – Restrict assignedTo for non-admins
3. Critical #3 – Fix ESLint config
4. High #4 – CSV parsing for quoted fields
5. High #6 – Timeout for Google Sheet fetch
