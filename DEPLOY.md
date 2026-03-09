# TeamDX Lead Manager – Render pe Deploy

## Prerequisites

1. **GitHub pe code push** – Project ko GitHub repo mein push karo
2. **Render account** – https://render.com pe sign up
3. **Supabase** – Project already Supabase use kar raha hai

---

## Step 1: GitHub pe Push

```bash
cd F:\TeamDX-Sheet
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 2: Render pe New Web Service

1. **Render Dashboard** → https://dashboard.render.com
2. **New** → **Web Service**
3. **Connect** your GitHub repo
4. Repo select karo

---

## Step 3: Settings

| Field | Value |
|-------|-------|
| **Name** | teamdx-lead-manager |
| **Region** | Singapore (ya apna nearest) |
| **Branch** | main |
| **Root Directory** | `webapp` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

---

## Step 4: Environment Variables

Render Dashboard → **Environment** → **Add Environment Variable**:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Auto set ho sakta hai |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Supabase → service_role (secret) |

---

## Step 5: Deploy

1. **Create Web Service** pe click
2. Render build start karega
3. 3–5 min baad app live ho jayega
4. URL milega: `https://teamdx-lead-manager.onrender.com`

---

## Blueprint (render.yaml) se Deploy

Agar `render.yaml` use karna ho:

1. **New** → **Blueprint**
2. Repo connect karo
3. Render `render.yaml` read karega
4. **Environment Variables** manually add karo (Dashboard → Service → Environment)

---

## Post-Deploy

1. **Supabase Auth** – Redirect URLs add karo:
   - Supabase → Authentication → URL Configuration
   - Site URL: `https://your-app.onrender.com`
   - Redirect URLs: `https://your-app.onrender.com/**`

2. **First user** – Local se create karo:
   ```bash
   cd webapp
   npm run create-user admin@teamdx.com AdminPass123 admin
   ```
   (Ya Supabase Dashboard se manually user add karo)

---

## Troubleshooting

- **Build fail** – Logs check karo, `npm run build` local pe test karo
- **500 error** – Env vars verify karo (SUPABASE_SERVICE_ROLE_KEY, etc.)
- **Auth redirect** – Supabase redirect URLs add karo
