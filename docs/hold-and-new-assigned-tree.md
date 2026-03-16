# Hold limit and New Assigned gate – tree structure

Hold = callback / reminder / follow-up. **Motive:** lead ko **Connected** branch tak lana. Hold ki bhi ek limit hai; 4th hold apply nahi hota — uski jagah **New Assigned** gate open hota hai.

---

## Tree (No Answer cycle example)

```
Not Connected — No Answer cycle (example)
│
├── Hold (callback / reminder / follow-up)
│   Motive: lead ko Connected branch tak lana
│   │
│   ├── Attempt 1  →  1 hold  (schedule / callback)
│   ├── Attempt 2  →  2 holds
│   └── Attempt 3  →  3 holds  (max hold limit)
│
└── After 3 holds (4th hold apply nahi)
    │
    └── New Assigned gate OPEN
        │
        └── Lead → New Assigned bucket (admin only)
                   (terminate/exhaust nahi; reassign ke liye)
```

---

## Rule summary

- **Hold** = callback / reminder / follow-up; motive = lead ko Connected tak lana.
- **Hold limit** = 3 (No Answer): attempt 1, 2, 3 = 3 holds; 4th hold block.
- **4th hold** → **New Assigned gate** open → lead moves to **New Assigned** bucket (admin only; not terminal/exhaust).
