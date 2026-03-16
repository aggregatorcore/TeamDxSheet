# Token System — Tree Structure (Logic Only)

```
Token system
├── Definition
│   ├── Token = number (1, 2, 3…) — is user ke us din (callback date) ki callback order
│   ├── Scope: per (assigned_to, date)
│   └── Same user: 7 Mar pe token 1, 8 Mar pe bhi token 1 — alag din, dono valid
│
├── Kab set hota hai
│   ├── Live: user callback schedule karta hai (CallDial / CallbackReminder / LeadDetail)
│   │   └── Order: shift adjust → 5-min slot + token resolve → DB save
│   └── Admin
│       ├── Backfill tokens: saari leads (callback_time wali) → group by (user, date) → sort by time → token 1,2,3…
│       └── Fix callback times: time shift se fix → phir token recompute (backfill logic)
│
├── 5-min slot (resolveSlotAndToken)
│   ├── Proposed time → shift TZ mein date (YYYY-MM-DD)
│   ├── Same user + same date wali leads fetch (is lead exclude)
│   ├── Minutes → 0, 5, 10, …, 55 (round down); slot occupied → next 5-min
│   └── Token = us din is user ke saare slots sort → is lead ka position (1-based)
│
├── Display
│   └── UI: "token · date" (e.g. 1 · 7 Mar) — same number alag din pe confuse na ho
│
└── Order guarantee (schedule save)
    └── Pehle shift (adjustCallbackTimeToShift), phir token (resolveSlotAndToken), phir DB
```

---

## No Answer tag — example

**Setup:** User = Rahul (shift 9:30 AM – 5:30 PM). Lead = Priya, number 9876543210.

**Step 1 – Dial:** Rahul lead pe call karta hai → connect nahi hua.

**Step 2 – Tag:** "Why didn't it connect?" → **No Answer** select.

**Step 3 – Schedule:** Auto-schedule (Attempt 1) = ab se **2 hour** → suppose ab 10:00 AM, to proposed time = **12:00 PM** (7 Mar).

**Step 4 – Shift logic:** 12:00 PM Rahul ke shift (9:30–5:30) ke andar hai, 7 Mar working day → time same rahega = **12:00 PM, 7 Mar**.

**Step 5 – Token:** Usi din (7 Mar) Rahul ki aur bhi callbacks:
- Lead A → 9:30 AM  
- Lead B → 9:35 AM  
- Lead C → 10:00 AM  
- **Priya (No Answer)** → 12:00 PM  

Time order: 9:30, 9:35, 10:00, 12:00 → Priya ka position = **4** → **token = 4**.

**Step 6 – Save:** Lead Priya → `tags: "No Answer"`, `callback_time: 7 Mar 12:00 PM`, `token: "4"`.

**Step 7 – UI:** Table mein dikhega: **4 · 7 Mar** | Priya | 9876543210 | 7/03, 12:00 pm | **No Answer** | Countdown…

**Summary:** No Answer tag → auto 2h (attempt 1) → shift ke andar time → us din ki order mein token 4 → display **4 · 7 Mar**.

---

## No Answer at 4 PM — shift end ke baad (example)

**Setup:** Rahul (shift 9:30 AM – 5:30 PM). Lead = Aajay. **Rahul 4 PM pe** Aajay ki lead pe call karta hai → connect nahi hua → **No Answer** apply karta hai.

**Step 1 – Auto-schedule (Attempt 1):** Ab se 2 hour → 4 PM + 2h = **6 PM same day** (e.g. 7 Mar 6:00 PM).

**Step 2 – Shift logic:** Rahul ka shift **5:30 PM** pe khatam. 6 PM shift ke **baad** hai → callback time **next working day** pe **shift start** pe shift ho jata hai → **8 Mar, 9:30 AM**.

**Step 3 – Token:** 8 Mar pe Rahul ke callbacks mein Aajay 9:30 AM pe hai. Agar us din 9:30 pe koi aur nahi to **token = 1**. Display: **1 · 8 Mar**.

**Step 4 – Save:** Lead Aajay → `tags: "No Answer"`, `callback_time: 8 Mar 9:30 AM`, `token: "1"`.

**Step 5 – UI:** Table: **1 · 8 Mar** | Aajay | … | 8/03, 9:30 am | No Answer | Countdown… (aur My Leads mein next day wale by default hide ho sakte hain; search se milenge.)

**Summary:** 4 PM pe No Answer → 2h = 6 PM (shift ke baad) → **shift logic** next day 9:30 AM kar deta hai → token us din ke hisaab (e.g. 1 · 8 Mar).

---

## Same day 5 leads No Answer at 9:30 (shift start) — token aur schedule time

**Setup:** Rahul ke paas **10 fresh leads** (same day). Shift **9:30 AM** start. Rahul **9:30 AM pe login** karta hai aur **pehli 5 leads** pe back-to-back **No Answer** apply karta hai (har lead dial → connect nahi → No Answer → Schedule).

**Sabka proposed time (Attempt 1):** Ab se 2 hour = **11:30 AM** (same day).

**5-min slot + token (order jis order mein save hue):**

| Lead (order) | Tag        | Proposed (2h) | Slot already occupied? | Resolved callback time | Token |
|--------------|-------------|----------------|-------------------------|-------------------------|-------|
| Lead 1       | No Answer   | 11:30 AM       | Nahi                    | **11:30 AM**            | **1** |
| Lead 2       | No Answer   | 11:30 AM       | 11:30 taken             | **11:35 AM**            | **2** |
| Lead 3       | No Answer   | 11:30 AM       | 11:30, 11:35 taken      | **11:40 AM**            | **3** |
| Lead 4       | No Answer   | 11:30 AM       | 11:30–11:40 taken       | **11:45 AM**            | **4** |
| Lead 5       | No Answer   | 11:30 AM       | 11:30–11:45 taken       | **11:50 AM**            | **5** |

**Agar 2 leads pe No Answer aur baaki pe Incoming Off (ya dusra tag):** Sirf **No Answer** (aur Switch Off, Busy IVR) wale leads pe auto 2h + 5-min slot + token lagta hai. Jo leads pe user **Incoming Off** select karta hai, unpe turant callback schedule nahi hota — **WhatsApp modal** open hota hai (Try WhatsApp flow). Wahan se user "Send to WhatsApp" / "WhatsApp No Reply" / "WhatsApp Not Available" karta hai; agar callback set hota hai (e.g. WhatsApp No Reply + Schedule) to us time pe bhi **same 5-min slot + token** logic lagta hai — us din ki existing callbacks (No Answer wale 11:30, 11:35, …) ke saath slot resolve hoke token milta hai.

**Short:** No Answer = 2h proposed → 5-min slot → token. Incoming Off = pehle WhatsApp flow; **follow-up ka time schedule** jab lagta hai (WhatsApp flow se) to us time pe bhi **shift adjust → 5-min slot → token** same tarah.

**Result:** Usi din (e.g. 7 Mar) Rahul ke callbacks:
- **1 · 7 Mar** — 11:30 AM  
- **2 · 7 Mar** — 11:35 AM  
- **3 · 7 Mar** — 11:40 AM  
- **4 · 7 Mar** — 11:45 AM  
- **5 · 7 Mar** — 11:50 AM  

**Summary:** Sabko No Answer = sabka auto 2h = 11:30. **5-min slot** ki wajah se pehla 11:30 pe, baaki har ek **next 5-min** (11:35, 11:40, 11:45, 11:50). Token = us din ki order 1, 2, 3, 4, 5.

---

## 5 leads: 3 No Answer + 2 Incoming Off — table

**Setup:** Rahul 9:30 AM pe 5 leads dial karta hai. **3 pe No Answer** select karta hai (callback schedule), **2 pe Incoming Off** select karta hai (WhatsApp modal open).

| Lead (order) | Tag          | Proposed / Action                    | Resolved callback time | Token   |
|--------------|--------------|--------------------------------------|-------------------------|---------|
| Lead 1       | No Answer    | 2h → 11:30 AM                        | **11:30 AM**            | **1**   |
| Lead 2       | No Answer    | 2h → 11:30 (slot taken) → 11:35       | **11:35 AM**            | **2**   |
| Lead 3       | Incoming Off | WhatsApp modal — abhi callback nahi  | —                       | —       |
| Lead 4       | No Answer    | 2h → 11:30 (11:30, 11:35 taken) → 11:40 | **11:40 AM**         | **3**   |
| Lead 5       | Incoming Off | WhatsApp modal — abhi callback nahi  | —                       | —       |

**Result (usi din):** Sirf No Answer wale 3 leads ko callback + token: **1 · 7 Mar** 11:30, **2 · 7 Mar** 11:35, **3 · 7 Mar** 11:40. Incoming Off wale 2 leads pe abhi koi callback/time/token nahi.

**Incoming Off mein follow-up ka time schedule:** Jab user WhatsApp flow se **follow-up / callback** set karta hai (e.g. WhatsApp No Reply → Schedule, ya Try WhatsApp ke baad koi time choose), to **us time pe bhi same logic** lagta hai: pehle **shift adjust** (time shift ke andar, week-off/leave skip), phir **5-min slot resolve** (us din ki existing callbacks — No Answer + pehle se jo Incoming Off follow-up schedule hain — ke saath next free slot), phir **token** us din ki order mein. Example: Lead 3 (Incoming Off) pe user 12:00 PM follow-up schedule karta hai → 7 Mar pe already 11:30, 11:35, 11:40 occupied → 12:00 free ho to **12:00 PM**, token **4**; agar 12:00 bhi kisi aur lead pe ho to next 5-min **12:05 PM**, token **5**.
