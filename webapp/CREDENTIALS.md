# TeamDX – Login Credentials

## Admin

Agar aapne `create-user` script se admin banaya hai:

```
Email:    admin@teamdx.com
Password: AdminPass123
```

**Admin create karne ke liye:**
```powershell
cd webapp
npm run create-user admin@teamdx.com AdminPass123 admin
```

**Admin kya dekh sakta hai:**
- **Exhaust** – Invalid/hidden leads (Invalid Number, WhatsApp No Reply 2 days, etc.)
- **Review** – Leads marked for review (is_in_review)
- **View** – Lead detail modal (Overview, Timeline, Documents)
- Dashboard se "Exhaust" button se admin page open hota hai

## Telecaller

```
Email:    telecaller@teamdx.com
Password: YourPassword123
```

**Telecaller create karne ke liye:**
```powershell
cd webapp
npm run create-user telecaller@teamdx.com YourPassword123 telecaller
```

---

**Login URL:** http://localhost:3000

> Note: Pehle `SUPABASE_SERVICE_ROLE_KEY` `.env.local` mein add karo (SETUP.md dekho).
