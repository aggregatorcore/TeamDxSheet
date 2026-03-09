# TeamDX Sheet - Lead Management System

In-app sheet (Supabase) for telecaller lead management. Har telecaller sirf apna data dekhega. **No Google Sheets** - sab data app ke andar.

## Setup

### 1. Supabase

1. [Supabase](https://supabase.com) project create karo
2. Authentication > Providers > Email enable (password signup)
3. Dashboard se `SUPABASE_URL` aur `SUPABASE_ANON_KEY` copy karo
4. SQL Editor me `webapp/supabase/migrations/001_create_leads.sql` run karo (leads + profiles table)
5. Admin banane ke liye: `profiles` table me apna user add karo with `role = 'admin'`

### 2. Environment

```bash
cd webapp
cp .env.example .env.local
```

`.env.local` me:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Run

```bash
cd webapp
npm install
npm run dev
```

Open http://localhost:3000

## Flow

- **Not Connected** → Tags: No Answer, Switch Off, Busy IVR, Incoming Off, Invalid Number
- **No Answer / Busy / Switch Off** → Call Back modal → schedule next call
- **Incoming Off** → WhatsApp modal → Try WhatsApp → Conversation start? Haan/Nahi
- **Invalid Number** → Lead `is_invalid = true`, telecaller ko nahi dikhega
- **Callback** → Time pe alert "Call karo", grace period ke baad no update = Overdue

## Admin

Admin `/dashboard/admin` pe invalid leads dekh sakta hai.
