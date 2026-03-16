# Complete flow tree – roots, branches, cycles, actions

Sab logic ek jagah: roots → branches (tags) → cycles / terminal → hold / New Assigned → auto-schedule → token → actions → modals. **Terminal = exhaust.** **Review = junction (senior); terminal nahi.**

---

## 1. Master tree (high level)

```
Flow (roots)
│
├── Not Connected
│   │
│   ├── Branches (tags): No Answer | Switch Off | Busy IVR | Incoming Off | Invalid Number
│   │
│   ├── 4 cycles (hold / callback)
│   │   ├── No Answer cycle   → hold 1–3 (attempt 1=2h, 2=8h, 3=12h); 4th → New Assigned gate
│   │   ├── Switch Off cycle  → same auto-schedule; hold limit logic
│   │   ├── Busy IVR cycle    → same auto-schedule; hold limit logic
│   │   └── Incoming Off cycle → Try WhatsApp; Conversation No → WhatsApp Not Available (terminal) / WhatsApp No Reply (follow-up)
│   │
│   ├── 1 terminal (exhaust)
│   │   └── Invalid Number → confirm → exhaust (no cycle, no callback)
│   │
│   └── Callback: shift-adjusted time → 5-min slot resolve → token (slot index) per user per day
│
└── Connected
    │
    ├── Branches (tags): Not Interested | Interested
    │   └── (Special: WhatsApp Flow Active – Incoming Off se aata hai)
    │
    ├── Not Interested → Review (junction); senior back/forward ya exhaust
    ├── Interested → cycle; sub-flow: Document received (action-notes)
    └── WhatsApp Flow Active → sub-flows: WhatsApp No Reply | WhatsApp Not Available (terminal → exhaust)
```

---

## 2. Expanded tree (cycles, actions, modals)

```
Flow
│
├── Not Connected
│   │
│   ├── No Answer cycle
│   │   ├── Action: Callback (Schedule callback / Call Now)
│   │   ├── Hold: Attempt 1 (2h), 2 (8h), 3 (12h) – auto-schedule + shift + token
│   │   ├── 4th hold block → New Assigned gate → New Assigned bucket (admin only)
│   │   └── Modals: CallDialModal → reason; CallbackReminderModal / OverdueCallModal
│   │
│   ├── Switch Off cycle
│   │   ├── Same: Callback action, auto-schedule 2h/8h/12h, shift, token
│   │   └── Hold limit (same pattern)
│   │
│   ├── Busy IVR cycle
│   │   └── Same as Switch Off
│   │
│   ├── Incoming Off cycle
│   │   ├── Action: Try WhatsApp → WhatsAppModal
│   │   ├── Conversation Yes → Connected branch
│   │   ├── Conversation No → WhatsApp Not Available → terminal (exhaust)
│   │   ├── Conversation No → WhatsApp No Reply → follow-up (WhatsApp Flow Active)
│   │   └── No same 2h/8h/12h auto-schedule
│   │
│   ├── Invalid Number (terminal)
│   │   ├── Action: Mark Invalid
│   │   ├── Modal: InvalidNumberModal → confirm → exhaust
│   │   └── No cycle, no callback
│   │
│   └── Token: every callback (auto/manual) → resolve 5-min slot → save callback_time + token
│
└── Connected
    │
    ├── Not Interested
    │   ├── Action: move_review (Move to Review)
    │   ├── Modal: NotInterestedModal
    │   └── Review = junction (senior); back/forward ya exhaust – terminal nahi
    │
    ├── Interested
    │   ├── Action: followup, move_green (Document received etc.)
    │   ├── Modals: InterestedModal, InterestedFollowupModal
    │   └── Sub-flow: Document received (table Sub flow column)
    │
    └── WhatsApp Flow Active (from Incoming Off)
        ├── Sub-flows: WhatsApp No Reply | WhatsApp Not Available
        ├── WhatsApp Not Available → terminal → exhaust
        └── Modal: WhatsAppModal
```

---

## 3. Quick reference

| Item | Value |
|------|--------|
| **Roots** | Connected, Not Connected |
| **Not Connected** | 5 tags = 4 cycles + 1 terminal (Invalid Number) |
| **Cycles** | No Answer, Switch Off, Busy IVR, Incoming Off |
| **Terminal** | Exhaust only. Invalid Number, WhatsApp Not Available (Incoming Off) → exhaust |
| **Review** | Junction (senior); back/forward ya exhaust. Terminal nahi |
| **Hold limit** | No Answer (example): 3 holds; 4th → New Assigned gate → New Assigned bucket (admin) |
| **Auto-schedule** | No Answer, Switch Off, Busy IVR: Attempt 1=2h, 2=8h, 3=12h (shift-adjusted) |
| **Token** | One lead per 5-min slot per user per day; token = slot index (1, 2, 3…) |
| **Actions** | callback, followup, move_review, move_green, move_exhaust, try_whatsapp; Call Now, Schedule callback, Mark Invalid |

**Modals:** CallDialModal, CallbackReminderModal, CallbackModal, OverdueCallModal, NotInterestedModal, InterestedModal, InterestedFollowupModal, WhatsAppModal, InvalidNumberModal, LeadDetailModal, NoteEditModal.

---

## 4. Related docs

- [GLOSSARY-FLOW-TAG-ACTIONS.md](GLOSSARY-FLOW-TAG-ACTIONS.md) – Flow, tag, sub-flow, action, modals, terminal vs review
- [hold-and-new-assigned-tree.md](hold-and-new-assigned-tree.md) – Hold limit and New Assigned gate
- [auto-schedule-rules-tree.md](auto-schedule-rules-tree.md) – 2h / 8h / 12h auto-schedule
- [token-system-rules.md](token-system-rules.md) – 5-min slot and token
