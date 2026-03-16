# Not Connected Flows – Complete Table Guide

**TeamDX Lead Manager · The Visa Fox**  
*Table format – No Answer, Switch Off, Busy IVR, Incoming Off, Invalid Number*

---

## Global rule (no confusion)

**Not Connected** = **5 tags**: No Answer | Switch Off | Busy IVR | Incoming Off | Invalid Number.

- **4 cycles:** No Answer cycle, Switch Off cycle, Busy IVR cycle, Incoming Off cycle.  
  Cycle = us tag se start se end tak ka complete flow.
- **1 terminal:** **Invalid Number**.  
  **Reason:** invalid number. No cycle, no callback.

**Terminal (global rule):** Terminal = **sirf exhaust**. Review terminal nahi (review = junction/hide for senior; back/forward ya exhaust). E.g. Invalid Number, WhatsApp Not Available (Incoming Off → exhaust). Same meaning everywhere.

---

## 1. No Answer Cycle – Complete Flow

| # | Step | Where | User action / System | Result / Next |
|---|------|--------|----------------------|----------------|
| 1 | Dial | CallDialModal | Row click → Dial | Call lagta hai |
| 2 | Connect? | CallDialModal | "Did the call connect?" | **Not connected** choose |
| 3 | Reason | CallDialModal | "Why didn't it connect?" | **No Answer** select |
| 4 | Schedule | CallDialModal | Date + Time → Schedule Callback | Lead save: tag No Answer, callbackTime, category callback |
| 5 | Table – counting | Lead table | Row: amber card, No Answer pill, countdown (Xm Ys), date | Wait / refresh |
| 6a | Call now | Lead table | Countdown khatam → Call Now button | CallbackReminderModal open |
| 6b | Overdue | Lead table | Time + grace nikal gaya → row red | OverdueCallModal open |
| 7a | Reminder – Dial | CallbackReminderModal | "Call this lead now" → Dial | Phir se call |
| 7b | Reminder – Connect? | CallbackReminderModal | "Did the call connect?" | Connected → step 9 / Not connected → step 8 |
| 8 | Reschedule | CallbackReminderModal | Not connected → reason → Schedule again | Lead update, attempt +1, table pe phir countdown |
| 9 | Connected | — | Interested / Not Interested | Cycle khatam, flow = Connected |
| 10 | Overdue – Dial | OverdueCallModal | Dial | CallDialModal open (step 1) |
| 11 | Cycle end | — | Naya tag apply (same ya different) | Naya cycle, attempt 1 se start |

**Table row (No Answer):** Attempt badge (2+) | No Answer pill | Divider | Countdown / Call Now / Overdue + date | Timeline (i)

---

## 2. Switch Off Cycle – Complete Flow

| # | Step | Where | User action / System | Result / Next |
|---|------|--------|----------------------|----------------|
| 1 | Dial | CallDialModal | Row click → Dial | Call lagta hai |
| 2 | Connect? | CallDialModal | "Did the call connect?" | **Not connected** |
| 3 | Reason | CallDialModal | "Why didn't it connect?" | **Switch Off** select |
| 4 | Schedule | CallDialModal | Date + Time → Schedule Callback | Lead save: tag **Switch Off**, callbackTime, category callback |
| 5 | Table – counting | Lead table | Row: amber card, **Switch Off** pill, countdown, date | Wait / refresh |
| 6a | Call now | Lead table | Countdown khatam → Call Now | CallbackReminderModal |
| 6b | Overdue | Lead table | Time + grace nikal gaya → row red | OverdueCallModal |
| 7a | Reminder – Dial | CallbackReminderModal | "Call this lead now" → Dial | Phir se call |
| 7b | Reminder – Connect? | CallbackReminderModal | "Did the call connect?" | Connected → step 9 / Not connected → step 8 |
| 8 | Reschedule | CallbackReminderModal | Not connected → reason → Switch Off (ya No Answer/Busy IVR) → Schedule again | Lead update, attempt +1 |
| 9 | Connected | — | Interested / Not Interested | Cycle khatam |
| 10 | Overdue – Dial | OverdueCallModal | Dial | CallDialModal (step 1) |
| 11 | Cycle end | — | Naya tag apply | Naya cycle, attempt 1 |

**Table row (Switch Off):** Same as No Answer; tag pill = **Switch Off**.

---

## 3. Busy IVR Cycle – Complete Flow

| # | Step | Where | User action / System | Result / Next |
|---|------|--------|----------------------|----------------|
| 1 | Dial | CallDialModal | Row click → Dial | Call lagta hai |
| 2 | Connect? | CallDialModal | "Did the call connect?" | **Not connected** |
| 3 | Reason | CallDialModal | "Why didn't it connect?" | **Busy IVR** select |
| 4 | Schedule | CallDialModal | Date + Time → Schedule Callback | Lead save: tag **Busy IVR**, callbackTime, category callback |
| 5 | Table – counting | Lead table | Row: amber card, **Busy IVR** pill, countdown, date | Wait / refresh |
| 6a | Call now | Lead table | Countdown khatam → Call Now | CallbackReminderModal |
| 6b | Overdue | Lead table | Time + grace nikal gaya → row red | OverdueCallModal |
| 7a | Reminder – Dial | CallbackReminderModal | "Call this lead now" → Dial | Phir se call |
| 7b | Reminder – Connect? | CallbackReminderModal | "Did the call connect?" | Connected → step 9 / Not connected → step 8 |
| 8 | Reschedule | CallbackReminderModal | Not connected → reason → Busy IVR (ya No Answer/Switch Off) → Schedule again | Lead update, attempt +1 |
| 9 | Connected | — | Interested / Not Interested | Cycle khatam |
| 10 | Overdue – Dial | OverdueCallModal | Dial | CallDialModal (step 1) |
| 11 | Cycle end | — | Naya tag apply | Naya cycle, attempt 1 |

**Table row (Busy IVR):** Same as No Answer; tag pill = **Busy IVR**.

---

## 4. Incoming Off Cycle – Complete Flow

| # | Step | Where | User action / System | Result / Next |
|---|------|--------|----------------------|----------------|
| 1 | Dial | CallDialModal | Row click → Dial | Call lagta hai |
| 2 | Connect? | CallDialModal | "Did the call connect?" | **Not connected** |
| 3 | Reason | CallDialModal | "Why didn't it connect?" | **Incoming Off** select |
| 4 | Try WhatsApp | CallDialModal | Incoming Off → (Save nahi) | **WhatsAppModal** open |
| 5 | Conversation start? | WhatsAppModal | "Did conversation start?" | **Yes** → step 9 / **No** → step 6 |
| 6 | No – sub choice | WhatsAppModal | **WhatsApp Not Available** ya **WhatsApp No Reply** | — |
| 7a | Not Available | WhatsAppModal | Apply → lead update | Tag Incoming Off, move to Admin/exhaust, cycle khatam |
| 7b | No Reply | WhatsAppModal | Apply → lead update | Tag **WhatsApp Flow Active**, callback set, follow-up cycle |
| 8 | Table (collaboration) | Lead table | Row: **Incoming Off + WhatsApp Flow Active** (expand/collapse), countdown | Follow-up / Callback flow |
| 9 | Yes – connected | — | Interested / Not Interested | Cycle khatam, flow = Connected |

**Table row (Incoming Off):** Collaboration block (Incoming Off + WhatsApp Flow Active), expand pe dono pills + attempt badge. Overdue pe red tint.

---

## 5. Invalid Number – Complete Flow

| # | Step | Where | User action / System | Result / Next |
|---|------|--------|----------------------|----------------|
| 1 | Dial | CallDialModal | Row click → Dial | Call lagta hai |
| 2 | Connect? | CallDialModal | "Did the call connect?" | **Not connected** |
| 3 | Reason | CallDialModal | "Why didn't it connect?" | **Invalid Number** select |
| 4 | Save / Move | CallDialModal | Lead save with tag **Invalid Number** | InvalidNumberModal open |
| 5 | Confirm | InvalidNumberModal | Confirm invalid / Mark invalid | Lead → exhaust |
| 6 | — | — | — | **Cycle khatam** – koi callback nahi |

**Table row (Invalid Number):** Sirf Invalid Number tag pill; koi callback/countdown nahi. Confirm ke baad exhaust.

---

## 6. Comparison – Not Connected Tags

| Item | No Answer | Switch Off | Busy IVR | Incoming Off | Invalid Number |
|------|------------|------------|----------|--------------|----------------|
| **Cycle** | Callback | Callback | Callback | Incoming Off → WhatsApp | None (terminal) |
| **Callback?** | Yes | Yes | Yes | No (No Reply → follow-up) | No |
| **Table card** | Amber + tag + countdown | Same | Same | Collaboration block | Tag only |
| **Modals** | CallDial → CallbackReminder / Overdue | Same | Same | CallDial → WhatsAppModal | CallDial → InvalidNumberModal |
| **End** | Connected / reschedule | Same | Same | Exhaust / WhatsApp follow-up | Exhaust |

---

## 7. Table Row Layout (Callback Cards – No Answer / Switch Off / Busy IVR)

| Slot | Content |
|------|--------|
| 1 (fixed) | Attempt badge (2+) – top-left |
| 2 | Tag pill: No Answer / Switch Off / Busy IVR |
| 3 | Divider |
| 4 | Countdown / Call Now / Overdue + date-time |
| 5 | Timeline (i) button |

---

*TeamDX Lead Manager · The Visa Fox · Not Connected Flows – Table Guide*
