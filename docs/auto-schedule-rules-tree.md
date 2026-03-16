# Auto-schedule rules (global)

When a callback is scheduled for **No Answer**, **Switch Off**, or **Busy IVR**, the system applies a **global auto-schedule rule** by attempt number. All times are then adjusted by **shift logic** (see shift-aware callback scheduling) so the callback never falls after shift end or on a week-off/leave day.

---

## Rule summary

| Attempt | Auto-schedule from now | Shift logic |
|--------|--------------------------|-------------|
| 1      | 2 hours                  | Yes         |
| 2      | 8 hours                  | Yes         |
| 3      | 12 hours                 | Yes         |

Same rule for: **No Answer**, **Switch Off**, **Busy IVR**.

---

## Tree structure

```
Not Connected
│
├── No Answer cycle
│   │
│   ├── Attempt 1  →  Auto-schedule: 2 hours (shift logic)
│   │   └── Schedule time = now + 2h, then adjust per shift / week-off / leaves
│   │
│   ├── Attempt 2  →  Auto-schedule: 8 hours (shift logic)
│   │   └── Schedule time = now + 8h, then adjust per shift / week-off / leaves
│   │
│   └── Attempt 3  →  Auto-schedule: 12 hours (shift logic)
│       └── Schedule time = now + 12h, then adjust per shift / week-off / leaves
│
├── Switch Off cycle
│   │
│   ├── Attempt 1  →  Auto-schedule: 2 hours (shift logic)
│   ├── Attempt 2  →  Auto-schedule: 8 hours (shift logic)
│   └── Attempt 3  →  Auto-schedule: 12 hours (shift logic)
│
├── Busy IVR cycle
│   │
│   ├── Attempt 1  →  Auto-schedule: 2 hours (shift logic)
│   ├── Attempt 2  →  Auto-schedule: 8 hours (shift logic)
│   └── Attempt 3  →  Auto-schedule: 12 hours (shift logic)
│
├── Incoming Off cycle   (different flow; no same auto-schedule rule)
└── Invalid Number       (terminal; no schedule)
```

---

## Code reference

- **Constants:** `CALLBACK_AUTO_SCHEDULE_HOURS = [2, 8, 12]` in `webapp/src/lib/constants.ts`
- **Helper:** `getAutoScheduleHoursForAttempt(attempt)` in `webapp/src/lib/leadNote.ts` returns 2, 8, or 12 for attempt 1, 2, 3; else `null`
- **Shift adjustment:** `adjustCallbackTimeToShift` in `webapp/src/lib/callbackShiftAdjust.ts` (used by PATCH /api/leads and POST /api/callbacks)
- **Hold limit:** After attempt 3, next schedule opens **New Assigned** gate (see `docs/hold-and-new-assigned-tree.md`)

---

## Related

- Shift-aware callback scheduling: schedule &gt; 1 hour from now is adjusted to fall within shift and skip week-off/leaves.
- Hold limit and New Assigned gate: `docs/hold-and-new-assigned-tree.md`, GLOSSARY §3.2.
