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

### 3.1 Not Connected: 4 cycles + 1 terminal (fixed – no confusion)

**Not Connected** flow mein **5 tags** hain: **No Answer | Switch Off | Busy IVR | Incoming Off | Invalid Number**.

- **4 cycles:** No Answer cycle, Switch Off cycle, Busy IVR cycle, Incoming Off cycle.  
  Cycle = us **tag** se start leke end tak ka **complete flow** (callback / Try WhatsApp etc.).
- **1 terminal:** **Invalid Number**.  
  **Reason:** number invalid; iska koi cycle nahi, koi callback nahi — confirm → exhaust.

**Summary:** Not Connected = **4 cycles + 1 terminal**. Terminal ka reason = **Invalid Number**.  
**Source of truth:** `NOT_CONNECTED_CYCLE_TAGS` (4 tags), `NOT_CONNECTED_TERMINAL_TAG` ("Invalid Number") in `types/lead.ts`.

### 3.2 Hold limit and New Assigned gate

- **Hold** = callback / reminder / follow-up actions that keep the lead in play. **Motive:** lead ko **Connected** branch tak lana. Hold hamesha continue nahi chalta — **hold ki bhi ek limit hai.**
- **Hold attempt count** = same as **attempt count** (per-cycle). No Answer pe: 1 schedule = 1 hold (attempt 1), 2 = 2 holds, 3 = 3 holds.
- **No Answer hold limit:** Max **3 holds** (attempt 3 tak). **4th hold apply nahi hoga** — uski jagah **"New Assigned" gate** open hoga.
- **New Assigned gate:** Lead **terminate** (exhaust) nahi hota. Lead **New Assigned** bucket mein move hota hai. Yeh bucket **sirf admin** ke paas dikhegi; admin reassign / next action karega.
- **Summary:** Terminal = exhaust (cycle khatam). Hold = reminder/follow-up (motive: Connected tak). Hold limit = 3 (No Answer); 4th → New Assigned gate → New Assigned bucket (admin only).  
- **Source of truth:** `MAX_HOLD_ATTEMPTS_NO_ANSWER`, `canScheduleMoreHolds(note, tag)` in `lib/leadNote.ts`; tree in `docs/hold-and-new-assigned-tree.md`.

### 3.3 Global: one lead per mobile number (primary key)

- **Rule:** **Mobile number = puri lead ki primary key.** System-wide ek hi number pe ek hi lead. Uniqueness **normalized number** se (spaces remove, comma se pehle wala part). Duplicate = same number, chahe assigned_to kuch bhi ho.
- **Create (POST /api/leads):** Agar is number pe kahin bhi (kisi bhi user ke paas) pehle se lead hai to **merge** — existing lead update (source/name/place), naya insert nahi.
- **Upload:** Jo number pehle se kisi bhi lead mein maujood hai ya batch mein repeat hai, wo rows **skip** (insert nahi). Response: `inserted`, `skippedDuplicates`.
- **Distribute:** Jab pool se user ko assign karte hain, agar is number pe kahi aur pehle se lead hai to pool wali lead **invalid** mark (duplicate khatam), assign nahi karte.
- **PATCH (number change):** Agar naya number kisi aur lead ke paas pehle se hai to **409** (one lead per number).
- **Cleanup:** Admin `POST /api/admin/merge-duplicate-leads` — saari **number** (global) duplicates dhundta hai, har number pe ek keep (oldest by created_at), note + latest callback_time merge, baaki ko **is_invalid = true**.
- **Source of truth:** `normalizeLeadNumber` in `lib/leadNumber.ts`; `getLeadByAssignedAndNumber` in `lib/db.ts`.

### 3.3.1 Token (per user, per date)

- **Rule:** Token is unique per **(assigned_to, date)**. Same user can have token 1 on Day 1 and token 1 on Day 2 – that is correct.
- **Display:** UI shows token + date (e.g. "1 · 7 Mar") so duplicate token numbers across days are clear. `formatTokenDisplay(lead)` in `lib/dateUtils.ts`.

### 3.4 Auto-schedule rule (No Answer, Switch Off, Busy IVR)

- **Global rule:** Attempt 1 = **2 hours**, Attempt 2 = **8 hours**, Attempt 3 = **12 hours** from now (all adjusted by shift logic).
- **Applies to:** No Answer cycle, Switch Off cycle, Busy IVR cycle only.
- **Shift logic:** Schedule &gt; 1 hour from now is adjusted so it falls within user shift and skips week-off/leaves (next working day at shift start if needed).
- **Source of truth:** `CALLBACK_AUTO_SCHEDULE_HOURS = [2, 8, 12]` in `lib/constants.ts`; `getAutoScheduleHoursForAttempt(attempt)` in `lib/leadNote.ts`. Tree in `docs/auto-schedule-rules-tree.md`.

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

## 8. Terminal (global rule – active)

**Terminal = sirf exhaust.** Review terminal nahi hai.

- **Terminal** = cycle khatam + **terminal gate open** + lead **exhaust** (exhaust bucket). Aage koi cycle/callback nahi.
- **Review** = terminal nahi. Review ek **junction / hide** hai: lead telecaller se temporarily hat jati hai, **senior** usko review karta hai — phir lead ko **back/forward** (telecaller ko wapas) ya **terminal (exhaust)** bhej sakta hai. Review = one-time hide for senior review; final terminal sirf exhaust.

| Where | Terminal outcome (sirf exhaust) | Result |
|-------|----------------------------------|--------|
| **Not Connected** | Invalid Number | Lead → **exhaust** (terminal). Reason: invalid number. |
| **Incoming Off cycle** | WhatsApp Not Available → Apply | Cycle khatam, lead → **exhaust** (terminal gate open). |

**Not Interested:** Lead pehle **review** pe jati hai (senior review); wahan se senior final karta hai — back/forward ya **exhaust** (terminal). Review khud terminal nahi.

**Use everywhere:** Terminal = sirf exhaust. Review ko terminal mat bolo.  
**Source:** `NOT_CONNECTED_TERMINAL_TAG`, exhaust move logic in modals (InvalidNumberModal, WhatsAppModal).

---

## 9. Overdue

- **Meaning:** Callback time + grace period (e.g. 2 hr) nikal chuka.  
- **Modal:** **OverdueCallModal** (Overdue + Dial / Back).  
- **Table:** Row blink/red; “Overdue” + Call Now type UI.  
- **Constants:** `GRACE_PERIOD_HOURS`, overdue state in `useCountdown` / LeadTable.

---

## 10. Collaboration (Incoming Off + WhatsApp – table block)

- **Name (UI):** “Incoming Off + WhatsApp Flow Active” collaboration block.  
- **Kab dikhta hai:** Jab lead pe Incoming Off **aur** WhatsApp Flow Active dono relevant hon (e.g. Not Connected + Incoming Off in history, ya WhatsApp Flow Active with callback).  
- **Behaviour:** Collapsed = ek pill (Incoming Off icon + link icon + WhatsApp icon). Click → expand (Incoming Off | WhatsApp Flow Active). Click outside / center icon → collapse.  
- **Code:** `showIncomingOffCollaborate`, `expandedCollaborationLeadId`, `data-collaboration-block`; title “Incoming Off + WhatsApp Flow Active — click to expand”.

---

## Quick lookup

- **Flow:** Connected | Not Connected  
- **Not Connected (global rule):** 5 tags = **4 cycles** (No Answer, Switch Off, Busy IVR, Incoming Off) + **1 terminal** (Invalid Number). Terminal reason = invalid number. Source: `NOT_CONNECTED_CYCLE_TAGS`, `NOT_CONNECTED_TERMINAL_TAG` in `types/lead.ts`.  
- **Terminal (global rule – active):** Terminal = **sirf exhaust**. Review terminal nahi (review = junction/hide for senior; wahan se back/forward ya exhaust). Examples: Invalid Number, WhatsApp Not Available (Incoming Off → exhaust). Not Interested → review (senior); final terminal = exhaust only.  
- **Review:** Terminal nahi. Review = junction/hide; lead senior ke paas; senior back/forward ya exhaust decide karta hai. Lead telecaller se temporarily remove (one-time hide).  
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
