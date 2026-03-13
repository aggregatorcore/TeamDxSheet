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

---

## Deployment & Fix Cloudflare Error 521

**Error 521 = "Web server is down"** — matlab Cloudflare tak request pohachti hai lekin aapka **origin server respond nahi kar raha**. Ye code bug nahi, server/hosting side fix chahiye.

### 1. Server chalana (production)

App jahan bhi host hai (VPS, Railway, Render, Vercel, etc.), wahan **process running** honi chahiye:

```bash
cd webapp
npm install
npm run build
npm run start
```

- **Vercel / Netlify:** Deploy karo; woh khud build + start karte hain. Dashboard me deploy status check karo.
- **VPS / VM:** Process hamesha chalegi isliye `pm2` use karo:
  ```bash
  npm run build && pm2 start npm --name "teamdx-web" -- start
  pm2 save && pm2 startup
  ```
- **Docker:** Container me `npm run build && npm run start` chalao; port 3000 expose karo.

### 2. Health check

Server up hai ya nahi, iske liye health endpoint use karo:

- **URL:** `https://your-domain.com/api/health`
- **Expected:** `{"ok":true,"ts":"..."}` with status 200

Agar ye bhi 521 de raha hai, to origin server bilkul reachable nahi hai.

### 3. Cloudflare settings

- **SSL/TLS:** Dashboard → SSL/TLS → Encryption mode = **Full** (agar origin pe HTTPS hai) ya **Flexible** (agar origin sirf HTTP hai).
- **Origin server:** DNS / A record jis IP ya host pe app chal rahi hai, woh sahi ho. Agar hosting URL change kiya (e.g. new Vercel URL), to Cloudflare me bhi update karo.

### 4. Checklist

| Step | Action |
|------|--------|
| 1 | Hosting dashboard me jao (Vercel/Railway/Render/VPS). |
| 2 | App **running** hai? Agar stopped/crashed hai to **restart** / **redeploy** karo. |
| 3 | `https://your-domain.com/api/health` browser me kholo — 200 + `{"ok":true}` aana chahiye. |
| 4 | Cloudflare SSL mode check karo (Full / Flexible). |
| 5 | Agar VPS pe self-host ho: `pm2 list` se process check karo, zarurat ho to `pm2 restart teamdx-web`. |

In steps ke baad Error 521 fix ho jana chahiye.
