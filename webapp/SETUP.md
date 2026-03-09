# TeamDX Setup – User Create + Login Test

## Step 0: DB columns

Supabase Dashboard → **SQL Editor** → New query → ye SQL chalao:

```sql
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS note text DEFAULT '';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp_followup_started_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_in_review boolean DEFAULT false;
```

## Step 1: Fix Trigger (agar "Database error creating new user" aata hai)

Supabase Dashboard → **SQL Editor** → New query → ye SQL chalao:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

## Step 2: Service Role Key add karo

1. Supabase Dashboard → **Project Settings** → **API**
2. **service_role** key copy karo (secret – share mat karo)
3. `webapp/.env.local` mein add karo:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...your-key...
```

## Step 3: User create karo (script se)

```powershell
cd F:\TeamDX-Sheet\webapp
npm run create-user telecaller@teamdx.com YourPassword123 telecaller
```

Admin user ke liye:

```powershell
npm run create-user admin@teamdx.com AdminPass123 admin
```

## Step 4: Login test karo

1. Dev server chalao: `npm run dev`
2. Browser: http://localhost:3000
3. Login: jo email/password script mein diya

## Manual option (script use na karo)

1. Supabase → **Authentication** → **Users** → **Add user**
2. Email + Password daalo → Create
3. **Table Editor** → `profiles` → **Insert row**:
   - **id:** user ka UUID (Authentication → Users → user pe click → id copy)
   - **email:** user ka email
   - **role:** `telecaller` ya `admin`
