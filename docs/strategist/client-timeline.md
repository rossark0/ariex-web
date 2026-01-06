# Client Timeline Pattern

The client timeline shows the journey of every client through the Ariex platform. This timeline is **consistent for all clients** and follows a predictable pattern based on the onboarding and strategy phases.

## Timeline Steps

Every client's timeline follows this 5-step pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: ACCOUNT CREATED                                         │
│ ● Always present - when strategist creates the client           │
│ Status: Always completed (indigo dot)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: AGREEMENT PHASE                                         │
│ ○ Agreement sent for signature                                  │
│ ● Service agreement signed                                      │
│ Action: [Resend] if pending                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: PAYMENT PHASE                                           │
│ ○ Payment pending · $499                                        │
│ ● Payment received · $499                                       │
│ Action: [Send reminder] if pending                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: DOCUMENTS PHASE                                         │
│ ○ Waiting for document upload                                   │
│ ● Initial documents uploaded · X files                          │
│ Action: [Request docs] if pending                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (only if onboarding complete)
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: STRATEGY PHASE                                          │
│ ○ Tax strategy pending (not created yet)                        │
│ ○ Strategy sent for approval (awaiting signature)               │
│ ● Tax strategy approved & signed                                │
│ Actions:                                                        │
│   [Create strategy] if not created                              │
│   [Resend] if sent but not signed                               │
│   [View] if signed                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Visual Indicators

| Element | Meaning |
|---------|---------|
| ● Emerald dot | Strategist has acted (sent/initiated step) |
| ○ Gray dot | Step not yet initiated by strategist |
| Emerald vertical line | Connects all steps |
| Emerald button | Primary action (pending step) |
| Zinc button | Secondary action (completed step, e.g., View) |

## Action Buttons

Buttons **only appear when the previous step is completed**. This enforces a linear progression:

| Step | Button Shows When | Button Label |
|------|-------------------|--------------|
| Step 2: Agreement | Step 1 complete (always) | Send agreement / Resend agreement |
| Step 3: Payment | Step 2 complete | Send payment link / Send reminder |
| Step 4: Documents | Step 3 complete | Request documents / Send reminder |
| Step 5: Strategy | Step 4 complete | Create strategy / Resend strategy |
| Step 5 (completed) | Always | View strategy (zinc) |

**Button Styling:**
- **Emerald** (`bg-emerald-600 text-white`): All pending action buttons
- **Zinc** (`bg-zinc-100 text-zinc-500`): Only for "View strategy" when step is complete

## Client Examples by Status

### New Client (ONBOARDING - nothing completed)
Buttons only show for the current actionable step:
```
● Account created
● Agreement sent for signature     [Resend agreement]  ← Button shows (Step 1 complete)
● Payment pending · $499           (no button - Step 2 not complete)
● Waiting for document upload      (no button - Step 3 not complete)
○ Tax strategy pending             (no button - Step 4 not complete)
```

### Partially Onboarded (agreement signed, awaiting payment)
```
● Account created
● Service agreement signed         (no button - completed)
● Payment pending · $499           [Send reminder]  ← Button shows (Step 2 complete)
● Waiting for document upload      (no button - Step 3 not complete)
○ Tax strategy pending             (no button - Step 4 not complete)
```

### Fully Onboarded (NO PLAN)
All onboarding complete, strategy not created:
```
● Account created
● Service agreement signed
● Payment received · $499
● Initial documents uploaded · 5 files
○ Tax strategy pending             [Create strategy]  ← Button shows (Step 4 complete)
```

### Plan Pending
Strategy sent, awaiting client signature:
```
● Account created
● Service agreement signed
● Payment received · $799
● Initial documents uploaded · 9 files
● Strategy sent for approval       [Resend strategy]
```

### Plan Active
All steps complete:
```
● Account created
● Service agreement signed
● Payment received · $799
● Initial documents uploaded · 9 files
● Tax strategy approved & signed   [View strategy]  ← Zinc button
```

## Implementation

The timeline is implemented in:
- `src/app/(app)/strategist/clients/[clientId]/page.tsx`

It dynamically renders based on the client's:
- `onboardingTasks` array (agreement, payment, documents)
- `payments` array
- `documents` array
- `isOnboardingComplete` flag
- Strategy document signature status

