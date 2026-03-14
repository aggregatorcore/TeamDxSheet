# Flow, Tag, Action & Modals – Single Reference

Ek format mein sab terms: cycle, flow, tag, sub-flow, action, modals, collaboration. **Sub-flow = question ke answer; table column name = Sub flow (sub-tag naam ki koi chiz nahi).**  
**Use:** Feature build karte waqt yahi se naam/meaning confirm karo.

---

## 1. Flow (call result – sirf 2)

| Flow Name       | Meaning                    | Kab set hota hai                          |
|-----------------|----------------------------|-------------------------------------------|
| **Connected**   | Call connect ho gaya        | CallDialModal / CallbackReminderModal mein "Connected" |
| **Not Connected** | Call connect nahi hua    | "Not connected" choose ya koi Not Connected tag select |

- **Source of truth:** `FlowOption` in `types/lead.ts`  
- **Display:** Table/UI mein flow column; colors `FLOW_COLORS` / `FLOW_TEXT_COLORS` (constants).

---

## 2. Table card type (display only – tag nahi, action dikhane ka tareeka)

Table cell mein row **kaise** dikhe (kaunsa card) – ye **tag nahi**, **action** dikhane ka format hai.  
**No Answer ka koi sub-flow nahi hai.** Amber card + countdown = **Callback action** (Schedule callback / Call Now).

| Card type (internal)    | Tag(s) involved        | Dikhta kya hai (action)        |
|------------------------|------------------------|--------------------------------|
| **no_answer_callback** | No Answer, Switch Off, Busy IVR | In tags pe **Callback** action: amber card + countdown + Call Now |
| **whatsapp_followup**  | WhatsApp Flow Active, Incoming Off | **Followup** action: violet card + countdown |
| **other_callback**     | Baaki callback wale tags | **Callback** action: tag + countdown |

- **Source of truth:** `getCallbackFlowType(lead)` in LeadTable.  
- **Important:** No Answer = **tag**. No Answer ka **koi sub-flow nahi**. Jo amber card + countdown dikhta hai wo **Callback action** hai, tag/sub-flow nahi.

---

## 3. Tag (main tag – lead.tags)

| Tag Name              | Flow context      | Short meaning                    |
|-----------------------|-------------------|----------------------------------|
| No Answer             | Not Connected     | Call connect nahi hua            |
| Switch Off            | Not Connected     | Phone off                        |
| Busy IVR              | Not Connected     | Busy / IVR                       |
| Incoming Off          | Not Connected     | Incoming band                    |
| Invalid Number        | Not Connected     | Number invalid                   |
| WhatsApp Flow Active  | (special)         | WhatsApp follow-up flow chal raha |
| Not Interested        | Connected         | Call connect, par interest nahi  |
| Interested            | Connected         | Call connect, interest hai       |

- **Document received tag nahi hai** – ye **Interested ka sub-flow** hai; Sub flow column mein dikhta hai.
- **Source of truth:** `TagOption` & `TAG_OPTIONS` in `types/lead.ts`.  
- **Flow se link:**  
  - Not Connected → `TAGS_FOR_NOT_CONNECTED`  
  - Connected → `TAGS_FOR_CONNECTED`  
  - Callback **action** (Schedule callback / Call Now) in No Answer cycle → `TAGS_SCHEDULEABLE_CALLBACK`: No Answer, Switch Off, Busy IVR.  
- **No Answer = tag. No Answer ka koi sub-flow nahi.**

---

## 4. Sub-flow (question ke answer; table column = Sub flow)

**No Answer, Switch Off, Busy IVR, Incoming Off, Invalid Number, Not Interested, Interested, Document received – in tags ka koi sub-flow nahi.**  
Sub-flow category: WhatsApp ke under; table column name **Sub flow**.

| Sub-flow name          | Parent tag              | Where used |
|------------------------|-------------------------|------------|
| **WhatsApp No Reply**  | WhatsApp Flow Active    | Note: `SubFlow: …`; table Sub flow column |
| **WhatsApp Not Available** | WhatsApp Flow Active | Same pattern |
| **Document received**  | Interested              | Note: `Action: Document received`; table Sub flow column |

**Interested ke andar “actions” (note mein Action: …; ye action-notes hain):**

- Asked client to share documents  
- Client said they will share something with us  
- Client will discuss and tell later  
- Client has trust issues  
- Client wants to visit  
- Document received  

- **Source of truth:**  
  - WhatsApp: `WhatsAppSubFlow`, `SUBFLOW_TEXT_COLORS`, `getWhatsAppSubFlow(lead.note)`  
  - Interested: `INTERESTED_ACTIONS` in constants, note `Action: <action>`.

---

## 5. Cycle (call attempt + tag – timeline)

- **Cycle name:** Timeline / LeadDetailModal mein jo “cycle” dikhta hai = **tag name** (e.g. No Answer, Interested) ya **"WhatsApp"** (WhatsApp flow).  
- **Steps (No Answer type):** Start cycle → Dial → Not connected → **Tag** → Callback schedule (date/time) → Cycle closed.  
- **Rule:** Cycle **tab close** hota hai jab dubara koi tag apply hota hai (same ya different). Overdue/countdown complete hone se cycle close nahi hota.  
- **Source of truth:** `getTagHistory(lead.note)`, `getAttemptHistory(lead.note)`, LeadDetailModal `getTimelineItems`, constants mein cycle rule comment.

---

## 6. Action (user action – button/label)

| Action (key)    | Label (ACTION_LABELS) | Meaning / use |
|-----------------|------------------------|---------------|
| callback        | Callback               | Schedule callback, Call Now (No Answer / reminder) |
| followup        | Followup               | Interested follow-up, WhatsApp follow-up |
| move_review     | Move to Review         | Review bucket |
| move_green      | Move to Green          | Green bucket |
| move_exhaust    | Move to Exhaust        | Exhaust bucket |
| try_whatsapp    | Try WhatsApp           | Incoming Off → WhatsApp flow |

**Sub-labels:**

- **Call Now** – callback time aa gaya, ab call karo.  
- **Schedule callback** – date/time set karo.  
- **Mark Invalid** – move to exhaust / invalid.

- **Source of truth:** `ActionType`, `ACTION_LABELS`, `CALL_NOW_LABEL`, `SCHEDULE_CALLBACK_LABEL`, `MARK_INVALID_LABEL` in constants.

---

## 7. Modals (screens – names & purpose)

| Modal name              | Opens when / purpose |
|-------------------------|----------------------|
| **CallDialModal**       | Row click → Dial; flow: Dial → Connected / Not connected → tag/action. “No Answer” flow start yahin. |
| **CallbackReminderModal** | Callback time aa gaya (Call Now) ya Overdue → Dial. Steps: reminder / callNow / result (Did the call connect?) / schedule. |
| **CallbackModal**       | Sirf callback date/time schedule karne ke liye (e.g. simple schedule flow). |
| **OverdueCallModal**    | Callback time overdue ho chuka; options: Back, Dial (→ CallDialModal). |
| **NotInterestedModal**  | Not Interested choose → reason + details form. |
| **InterestedModal**     | Interested choose → full Interested form (profile + action). |
| **InterestedFollowupModal** | Interested + callback/follow-up; schedule follow-up call. |
| **WhatsAppModal**       | Incoming Off → Try WhatsApp; WhatsApp Not Available / No Reply + Apply. |
| **InvalidNumberModal**  | Invalid Number tag → confirm / move. |
| **LeadDetailModal**     | Lead ki full detail + timeline (cycles, notes). |
| **NoteEditModal**       | Note edit (manual part). |

---

## 8. Overdue

- **Meaning:** Callback time + grace period (e.g. 2 hr) nikal chuka.  
- **Modal:** **OverdueCallModal** (Overdue + Dial / Back).  
- **Table:** Row blink/red; “Overdue” + Call Now type UI.  
- **Constants:** `GRACE_PERIOD_HOURS`, overdue state in `useCountdown` / LeadTable.

---

## 9. Collaboration (Incoming Off + WhatsApp – table block)

- **Name (UI):** “Incoming Off + WhatsApp Flow Active” collaboration block.  
- **Kab dikhta hai:** Jab lead pe Incoming Off **aur** WhatsApp Flow Active dono relevant hon (e.g. Not Connected + Incoming Off in history, ya WhatsApp Flow Active with callback).  
- **Behaviour:** Collapsed = ek pill (Incoming Off icon + link icon + WhatsApp icon). Click → expand (Incoming Off | WhatsApp Flow Active). Click outside / center icon → collapse.  
- **Code:** `showIncomingOffCollaborate`, `expandedCollaborationLeadId`, `data-collaboration-block`; title “Incoming Off + WhatsApp Flow Active — click to expand”.

---

## Quick lookup

- **Flow:** Connected | Not Connected  
- **Tag:** No Answer, Switch Off, Busy IVR, Incoming Off, Invalid Number, WhatsApp Flow Active, Not Interested, Interested, Document received. **No Answer ka koi sub-flow nahi.**  
- **Sub-flow:** Question ke answers; table column = **Sub flow**. WhatsApp: WhatsApp No Reply, WhatsApp Not Available (parent: WhatsApp Flow Active). Interested ke andar action-notes (INTERESTED_ACTIONS).  
- **Action:** callback, followup, move_*, try_whatsapp (+ Call Now, Schedule callback, Mark Invalid). **Amber card + countdown = Callback action, tag/sub-flow nahi.**  
- **Table card type (display):** no_answer_callback = No Answer (etc.) + **Callback action** dikhane ka format; whatsapp_followup = **Followup action**; other_callback = baaki callback.  
- **Cycle name:** Tag name ya "WhatsApp" (timeline)  
- **No Answer modal flow:** CallDialModal → Connected/Not connected → tag; CallbackReminderModal for reminder/call now/schedule  
- **Overdue modal:** OverdueCallModal  
- **Collaboration:** Incoming Off + WhatsApp Flow Active (expand/collapse block in table)

---

*Is file ko update karte waqt types/constants/LeadTable/LeadDetailModal se sync rakhna.*
