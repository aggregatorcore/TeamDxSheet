# Admin ke pass code ke hisaab se kya dikhna chahiye

Code (`DashboardShell`, `dashboard/page`, `dashboard/leads`, `dashboard/create-user`) ke according **admin user** ko ye sab dikhna chahiye.

---

## 1. Header / Nav (DashboardShell)

| Item | Admin ko | Telecaller ko |
|------|----------|----------------|
| **Leads** | ✅ Dikhega – `/dashboard/leads` (Leads Management) | ❌ Nahi |
| **Work** | ✅ Label: "Work" | ❌ Label: "My Leads" |
| **Buckets** | ✅ Label: "Buckets" | ❌ Label: "My Buckets" |
| **Green** | ✅ (Buckets ke andar) | ✅ |
| **Live** | ✅ Dikhega – `/dashboard?view=live` | ❌ Nahi |
| **Users** | ✅ Dikhega – `/dashboard/create-user` (green style) | ❌ Nahi |
| Logo ke neeche name | ❌ (sirf telecaller ko) | ✅ |
| Email badge (right side) | ✅ Dikhega | ❌ Nahi |
| Refresh, Logout | ✅ Dono | ✅ Dono |

**Summary:** Admin ko nav mein **5 items** dikhne chahiye: **Leads** | **Work** | **Buckets** | **Live** | **Users**.

---

## 2. Main content (dashboard/page) – view ke hisaab se

| View | Admin ko kya dikhega |
|------|----------------------|
| **Leads / Work** (`view=leads`) | Apne assigned leads ki table (LeadTable) – same as telecaller |
| **Buckets → Green** | Apne Green bucket leads (GreenBucketTable) |
| **Buckets → Exhaust** | ✅ **Sirf admin:** Exhaust bucket ki table (AdminLeadsTable), count badge |
| **Buckets → Review** | ✅ **Sirf admin:** Review bucket ki table (AdminLeadsTable), count badge |
| **Live** | ✅ **Sirf admin:** LiveSheetTable – har telecaller ke Work/Green/Review/Exhaust count, row click par us telecaller ki leads modal |

Telecaller ko **Exhaust**, **Review**, **Live** options hi nahi dikhte.

---

## 3. Leads Management (`/dashboard/leads`) – sirf admin

Admin **Leads** nav click kare to ye page open hota hai. Isme **3 tabs** hain:

| Tab | Kya dikhna chahiye |
|-----|---------------------|
| **Upload** | CSV upload, Google Sheet se fetch, validate, "Upload to Pool" – leads pool mein jaati hain |
| **Distribute** | Pool / Assigned toggle, pool leads list, select all, Assign button, Round-robin / Direct assign, Delete selected, Delete all leads (danger zone) |
| **Advance** | Placeholder – "Advance and start logic will be added here" |

---

## 4. Users (`/dashboard/create-user`) – sirf admin

Admin **Users** nav click kare to ye page open hota hai:

- **All Users** list – email, name, role (admin/telecaller), status (active/exited), Edit / Change password / Ban
- **Create User** – email, full name, password, role (telecaller/admin)
- Non-admin agar direct URL open kare to redirect `/dashboard`

---

## 5. Short checklist – admin login ke baad verify karo

- [ ] Nav mein **Leads**, **Work**, **Buckets**, **Live**, **Users** sab dikh rahe hain
- [ ] **Buckets** open karne par **Green** | **Exhaust** | **Review** sub-tabs dikh rahe hain
- [ ] **Exhaust** / **Review** pe click se wahi bucket ki table dikh rahi hai
- [ ] **Live** pe click se LiveSheetTable (telecaller-wise counts) dikh raha hai
- [ ] **Leads** pe click se Leads Management (Upload / Distribute / Advance) open ho raha hai
- [ ] **Users** pe click se Create User + All Users page open ho raha hai

Agar inme se kuch nahi dikh raha ho to `profiles.role = 'admin'` check karo (Supabase) – ref: `supabase/ADMIN_PROFILE_FIX.md`.
