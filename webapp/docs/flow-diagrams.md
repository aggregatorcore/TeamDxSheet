# Lead Management – Flow Diagrams

## Cycles by tag name (summary)

| # | Tag name | Cycle? | Cycle name | Notes |
|---|----------|--------|------------|--------|
| 1 | **No Answer** | Yes | Callback cycle | Schedule → countdown → CallbackReminder → connect / reschedule / overdue |
| 2 | **Switch Off** | Yes | Same as No Answer | Callback cycle (same flow) |
| 3 | **Busy IVR** | Yes | Same as No Answer | Callback cycle (same flow) |
| 4 | **Incoming Off** | Yes | Incoming Off cycle | Try WhatsApp → Not Available (exhaust) / No Reply (follow-up cycle) |
| 5 | **Invalid Number** | No | — | Single outcome (InvalidNumberModal / mark active), no callback |
| 6 | **WhatsApp Flow Active** | Yes | WhatsApp follow-up cycle | Did reply come? → schedule again / 2 days → exhaust / connected |
| 7 | **Interested** | Yes | Interested cycle | New / Document received → document follow-up, etc. |
| 8 | **Document received** | Yes | Part of Interested | Document follow-up (callback/follow-up) |
| 9 | **Not Interested** | No | — | Reason + form → review (terminal) |

**Total distinct cycles by tag:**  
- **Callback cycle:** 3 tags (No Answer, Switch Off, Busy IVR) → **1 cycle**  
- **Incoming Off cycle:** 1 tag → **1 cycle**  
- **WhatsApp follow-up cycle:** 1 tag (WhatsApp Flow Active) → **1 cycle**  
- **Interested / Document cycle:** 2 tags → **1 cycle**  
- **No cycle (terminal):** Invalid Number, Not Interested → **0 cycles**

So by tag name: **4 unique cycles**; **9 tags** (7 with a cycle path, 2 terminal).

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
