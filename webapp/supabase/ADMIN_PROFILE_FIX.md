# Admin panel nahi dikh raha – Supabase diagnosis & fix

## Problem
Admin login ke baad bhi **Leads**, **Live**, **Users** nav nahi dikh rahe – sirf "My Leads", "My Buckets" (telecaller view) dikh raha hai.  
Matlab app ko **admin role** nahi mil raha.

---

## Root cause (migrations se)

1. **`profiles` table** (migration 001):
   - `id` = auth.users.id
   - `email`, `role` (telecaller | admin)
   - **RLS enable nahi hai** – is migration mein `profiles` par RLS nahi lagaya gaya

2. **Agar Supabase Dashboard se baad mein `profiles` par RLS enable kiya** ho, aur policy aisi ho ke "sirf admin read kar sakte hain", to **khud ka profile read karte waqt** bhi block ho sakta hai (circular: role jaanne ke liye profile chahiye, profile ke liye admin hona chahiye).

3. **Profile row missing ya role galat**
   - Admin user **Sign up** se bana (Create User se nahi) → trigger `handle_new_user()` **role = 'telecaller'** set karta hai.
   - `fix_user_trigger.sql` run kiya ho → trigger drop ho gaya → naye users ke liye **profile row hi nahi banti**.
   - To ho sakta hai: ya to profile row nahi hai, ya hai to `role = 'telecaller'`.

4. **Service role key**
   - Layout ab admin client se profile read karta hai; agar env mein `SUPABASE_SERVICE_ROLE_KEY` missing hai to fallback normal client pe jata hai. Normal client + RLS block = profile null → admin nav nahi dikhega.

---

## Fix (Supabase SQL Editor mein run karo)

### Step 1: Check current state
```sql
-- 1) Auth users vs profiles
select u.id, u.email, p.role, p.email as profile_email
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc
limit 20;
```
Dekho: jis user ko admin banana hai uski row `profiles` mein hai ya nahi, aur `role` kya hai.

### Step 2: Admin user ko profile + role fix karo
Apna admin email use karo (jis se login ho rahe ho):

```sql
-- Replace 'your-admin@example.com' with your actual admin login email
insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where email = 'your-admin@example.com'
on conflict (id) do update set role = 'admin', email = excluded.email;
```

### Step 3: (Optional) RLS on profiles – sirf apna row read
Agar tumne `profiles` par RLS enable kiya hua hai aur read block ho raha hai, to ye policy add karo taaki **har user apna profile read kar sake** (role check ke liye zaroori):

```sql
alter table public.profiles enable row level security;

-- Har user apna profile dekh sakta hai (role check ke liye)
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);
```

---

## Summary

| Issue | Fix |
|-------|-----|
| Profile row hi nahi hai | Step 2 – `insert ... on conflict do update` |
| Role = 'telecaller' hai | Step 2 – `do update set role = 'admin'` |
| RLS block kar raha hai | Step 3 – "Users can read own profile" policy |
| Service role key missing | Render/env mein `SUPABASE_SERVICE_ROLE_KEY` set karo |
| Profile read fails (RLS) | Run migration `007_profiles_read_own.sql` so users can read own profile |
| Fallback when profile/DB fails | Set `ADMIN_EMAILS=admin@teamdx.com` (comma-separated) in env – those emails are treated as admin |

Step 2 run karke **page refresh** (ya re-login) karo – admin nav (Leads, Live, Users) dikhna chahiye.
