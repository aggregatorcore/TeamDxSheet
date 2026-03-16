# Token system rules

When a callback is scheduled (auto or manual), **no two leads** for the same user may have the **same callback time**. Each lead gets a **5-minute slot** and a **token number** (slot index for that day) shown in the Token column.

---

## Rule summary

- **Slot granularity:** 5 minutes (9:30, 9:35, 9:40, …).
- **Constraint:** One lead per 5-minute slot per user (`assigned_to`) per day (in shift timezone).
- **Token:** Numeric slot index for that day (1, 2, 3, …). Stored in `leads.token`, displayed in the Token column.
- **Unique token:** Har lead ko ek hi token number; jo number kisiko de diya wo uske paas **reserved** – dusri lead ko wahi number assign nahi hota. Example: 5 leads ⇒ tokens 1, 2, 3, 4, 5 (kabhi 1, 1, 2, 3, 3 nahi).
- **Process:** After shift adjustment (if any), resolve the proposed time to the next free 5-min slot; assign token; save.

---

## Tree structure

```
Token system rule (auto-schedule / next-day logic)
│
├── Input: Lead ka proposed callback time (e.g. next working day 9:30 AM after shift adjustment)
│
├── Constraint: No two leads for same user (assigned_to) can have same callback time slot
│   └── Slot = 5-minute bucket (9:30, 9:35, 9:40, …)
│
├── Process
│   │
│   ├── 1. Resolve slot
│   │   │   Query: other leads for same assigned_to with callback_time on same day (shift TZ)
│   │   │   Exclude current lead (id)
│   │   │
│   │   ├── If lead ke liye slot free hai → use that time; token = (count of callbacks on that day at or before this slot) + 1
│   │   │
│   │   └── If slot taken (dusri lead already hai) → proposed time += 5 min; repeat until free slot
│   │       └── Token = slot index for that day (1, 2, 3, …)
│   │
│   └── 2. Persist
│       └── Save resolved callback_time + token to lead
│
└── Output: Lead has unique callback_time (5-min slot) and token number in Token column
```

**Example (same user, next day 9:30 AM):**

| Lead A (already scheduled) | Lead B (new auto-schedule) |
|----------------------------|----------------------------|
| callback_time = 9:30 AM    | Lead B 9:30 → taken → 9:35 AM |
| token = 1                  | token = 2                  |

---

## Code reference

- **Slot resolution:** `resolveSlotAndToken()` in `webapp/src/lib/tokenSlot.ts`
- **Integration:** PATCH `webapp/src/app/api/leads/route.ts` and POST `webapp/src/app/api/callbacks/route.ts` (after shift adjustment)
- **DB:** `leads.token` column (migration `010_leads_token.sql`); mapping in `webapp/src/lib/db.ts`
- **UI:** Token column in `webapp/src/components/LeadTable.tsx` shows `lead.token`

---

## Related

- Shift-aware callback scheduling: `adjustCallbackTimeToShift` in `webapp/src/lib/callbackShiftAdjust.ts`
- Auto-schedule rules: `docs/auto-schedule-rules-tree.md`
