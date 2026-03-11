# Development Rules – Live vs Local

## Live (Production)
- **Live project ab chal raha hai – use mat chhedna.**
- Jo live pe chal raha hai waise hi chalne do.
- Live pe deploy / direct changes mat karo jab tak changes local pe fully test na ho jayein.

## New Work (Improvements)
- **Naye improvements sirf local pe karo** – localhost pe develop karo, wahi pe test karo.
- Local pe test complete hone ke baad hi koi change live pe consider karna.

## Database (Supabase)
- **DB mein data loss bilkul nahi hona chahiye** – kisi bhi tarah se.
- Migrations / schema changes pe dhyan: pehle local ya staging DB pe test karo.
- Production DB par destructive queries (mass delete, drop column, etc.) mat chalao bina confirm ke.
- Agar same Supabase project use ho raha hai local + live dono ke liye, to **read-heavy** testing karo; write/delete operations hamesha careful.

## Summary
| Where        | Action                                      |
|-------------|---------------------------------------------|
| **Live**    | Do not touch; keep running as-is            |
| **Localhost** | All new improvements + testing here     |
| **DB**      | No data loss; test migrations locally first |
