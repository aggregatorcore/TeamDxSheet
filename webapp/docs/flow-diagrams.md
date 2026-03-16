# Lead Management – Flow Diagrams

## Not Connected: 4 cycles + 1 terminal (global rule)

**Not Connected** = **5 tags**: No Answer | Switch Off | Busy IVR | Incoming Off | Invalid Number.

- **4 cycles:** No Answer cycle, Switch Off cycle, Busy IVR cycle, Incoming Off cycle.  
  (Cycle = us tag se start se end tak ka complete flow.)
- **1 terminal:** **Invalid Number**. Reason = invalid number; no cycle, no callback.

**Source of truth:** `NOT_CONNECTED_CYCLE_TAGS`, `NOT_CONNECTED_TERMINAL_TAG` in `types/lead.ts`. Is rule ko globally use karo — confusion avoid.

---

## Terminal (global rule – active)

**Terminal = sirf exhaust.** Review terminal nahi.

- **Terminal** = cycle khatam + terminal gate open + lead **exhaust**. Aage koi cycle/callback nahi.
- **Review** = terminal nahi. Review = junction/hide; lead senior ke paas; senior back/forward ya exhaust (terminal) decide karta hai.

| Where | Terminal (sirf exhaust) | Result |
|-------|-------------------------|--------|
| Not Connected | Invalid Number | Lead → exhaust. Reason: invalid number. |
| Incoming Off cycle | WhatsApp Not Available → Apply | Cycle khatam, lead → exhaust (terminal gate open). |

Not Interested → review (senior review); final terminal = exhaust only. See GLOSSARY §8.

---

## Hold limit and New Assigned gate

- **Hold** = callback/reminder/follow-up; motive = lead ko Connected tak lana. Hold ki limit hai (e.g. No Answer: max 3 attempts).
- **4th hold** apply nahi hota → **New Assigned gate** open → lead **New Assigned** bucket (admin only; not terminal/exhaust).  
- See `docs/hold-and-new-assigned-tree.md` and GLOSSARY §3.2.

---

## Auto-schedule rule (No Answer, Switch Off, Busy IVR)

- **Attempt 1** = 2 hours, **Attempt 2** = 8 hours, **Attempt 3** = 12 hours from now (all adjusted by shift logic on save).
- Same rule for No Answer, Switch Off, Busy IVR cycles. See `docs/auto-schedule-rules-tree.md` and GLOSSARY §3.3.

---

## Cycles by tag name (summary)

| # | Tag name | Cycle? | Cycle name | Notes |
|---|----------|--------|------------|--------|
| 1 | **No Answer** | Yes | No Answer cycle | Schedule → countdown → CallbackReminder → connect / reschedule / overdue |
| 2 | **Switch Off** | Yes | Switch Off cycle | Same flow as No Answer cycle |
| 3 | **Busy IVR** | Yes | Busy IVR cycle | Same flow as No Answer cycle |
| 4 | **Incoming Off** | Yes | Incoming Off cycle | Try WhatsApp → Not Available (exhaust) / No Reply (follow-up) |
| 5 | **Invalid Number** | No (terminal) | — | Reason: invalid number. No cycle, no callback. |
| 6 | **WhatsApp Flow Active** | Yes | WhatsApp Flow Active cycle | Did reply come? → schedule again / 2 days → exhaust / connected |
| 7 | **Interested** | Yes | Interested cycle | New / Document received → document follow-up, etc. |
| 8 | **Document received** | Yes | Part of Interested | Document follow-up (callback/follow-up) |
| 9 | **Not Interested** | No (→ review) | — | Reason + form → review (senior); review terminal nahi, senior back/forward ya exhaust |

**Not Connected:** 4 cycles + 1 terminal (Invalid Number → exhaust). Terminal = sirf exhaust.  
**Connected:** 1 cycle (Interested). Not Interested → review (senior); review terminal nahi.  
**Special:** WhatsApp Flow Active cycle.

---

## 1. No Answer cycle (detailed)

```mermaid
flowchart TB
    subgraph Call["CallDialModal"]
        A[Dial] --> B{Did call connect?}
        B -->|Not connected| C[Why didn't it connect?]
        C --> D[No Answer / Switch Off / Busy IVR]
        D --> E[Schedule: Date + Time]
        E --> F[Schedule Callback]
        F --> G[(Lead saved: tag No Answer, callbackTime, category callback)]
    end

    subgraph Table["Table"]
        G --> H[Row: No Answer + countdown + date]
        H --> I{Time in blink window?}
        I -->|Yes| J[Call now button]
        I -->|No| K[Wait / countdown]
        K --> I
    end

    subgraph Callback["CallbackReminderModal"]
        J --> L[Callback – call this lead now]
        L --> M[Dial] --> N[Did the call connect?]
        L --> O[Not now] --> P[Close]
        H --> Q[Client callback received]
        Q --> N
        N -->|Connected| R[Lead → Connected]
        N -->|Not connected| S[Why didn't it connect?]
        S --> T[No Answer / Switch Off / Busy IVR / Incoming Off / Invalid]
        T --> U[Schedule again] --> G
    end

    subgraph Overdue["Overdue"]
        H --> V{Callback time + grace passed?}
        V -->|Yes| W[OverdueCallModal]
        W --> X[Dial / Copy number / Not now]
    end
```

---

## 2. All main cycles (overview)

```mermaid
flowchart LR
    subgraph Entry["Entry"]
        ROW[Table row click]
    end

    subgraph CallCycle["Call cycle"]
        ROW --> CALL[CallDialModal]
        CALL --> CONN{Connect?}
        CONN -->|Yes| INT[Interested / Not Interested]
        CONN -->|No| REASON[Reason]
        REASON --> NOANS[No Answer / Switch Off / Busy IVR]
        REASON --> INCOFF[Incoming Off]
        REASON --> INVALID[Invalid Number]
        NOANS --> SCHED[Schedule callback]
        INCOFF --> WA_MODAL[WhatsAppModal]
    end

    subgraph NoAnswerCycle["No Answer cycle"]
        SCHED --> CB_ROW[Row: callback countdown]
        CB_ROW --> CB_MODAL[CallbackReminderModal]
        CB_MODAL --> CB_NOW[Call now]
        CB_NOW --> CONN
    end

    subgraph IncomingOffCycle["Incoming Off cycle"]
        WA_MODAL --> WA_SEND[Send to WhatsApp]
        WA_SEND --> WA_YESNO{Conversation start?}
        WA_YESNO -->|Yes| CONN
        WA_YESNO -->|No| WA_NA[WhatsApp Not Available → Exhaust]
        WA_YESNO -->|No| WA_NR[WhatsApp No Reply → Follow-up]
    end

    subgraph WhatsAppFollowup["WhatsApp follow-up cycle"]
        WA_NR --> FU_ROW[Row: Followup countdown]
        FU_ROW --> FU_MODAL[WhatsAppFollowupModal]
        FU_MODAL --> FU_YESNO{Reply came?}
        FU_YESNO -->|Yes| CONN
        FU_YESNO -->|No| FU_SCHED[Schedule next / Custom]
        FU_YESNO -->|No, 2 days| EXHAUST[Exhaust]
    end

    subgraph OverdueFlow["Overdue"]
        CB_ROW --> OVD{Overdue?}
        FU_ROW --> OVD
        OVD -->|Regular| OVD_CALL[OverdueCallModal]
        OVD -->|WhatsApp flow| FU_MODAL
        OVD -->|Incoming Off only| WA_MODAL
    end
```

---

## 3. No Answer – linear steps (simple)

```mermaid
flowchart TD
    A[1. CallDial: Not connected] --> B[2. Select No Answer]
    B --> C[3. Schedule date & time]
    C --> D[4. Lead saved: No Answer + callback]
    D --> E[5. Table: countdown + Call now]
    E --> F[6. CallbackReminderModal]
    F --> G{7. Did call connect?}
    G -->|Connected| H[Interested / Not Interested]
    G -->|Not connected| I[8. Reason again → reschedule]
    I --> C
    E --> J[Overdue? → OverdueCallModal]
```

---

## 4. State view – where a lead can be

```mermaid
stateDiagram-v2
    [*] --> Fresh
    Fresh --> CallDial: Row click

    CallDial --> NoAnswerScheduled: No Answer + Schedule
    CallDial --> IncomingOffFlow: Incoming Off
    CallDial --> Invalid: Invalid Number
    CallDial --> Interested: Connected + Interested
    CallDial --> NotInterested: Connected + Not Interested

    NoAnswerScheduled --> CallbackReminder: Time in window / click
    NoAnswerScheduled --> Overdue: Time passed
    CallbackReminder --> NoAnswerScheduled: Not connected + reschedule
    CallbackReminder --> Interested: Connected
    CallbackReminder --> NotInterested: Connected
    Overdue --> CallDial: Dial

    IncomingOffFlow --> WhatsAppModal: Try WhatsApp
    WhatsAppModal --> Exhaust: WhatsApp Not Available
    WhatsAppModal --> WhatsAppFollowup: WhatsApp No Reply
    WhatsAppFollowup --> WhatsAppFollowup: Schedule next
    WhatsAppFollowup --> Exhaust: 2 days no reply
    WhatsAppFollowup --> Interested: Reply came
```

---

*Generated for TeamDX-Sheet Lead Management. View in any Mermaid-compatible viewer (e.g. GitHub, VS Code with Mermaid extension).*
