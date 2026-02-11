# ActivityTimeline — Complete Status Flow Analysis

## The 5-Step Linear Pipeline

The timeline is a **strict sequential pipeline** — each step gates the next. The flow maps directly to the `AgreementStatus` enum:

| Step | Timeline Label | Agreement Status | `statusKey` | Gate to Next |
|------|---------------|-----------------|-------------|--------------|
| **1** | Account Created | *(always true)* | — | Always complete |
| **2** | Agreement | `DRAFT` → `PENDING_SIGNATURE` → signed | `awaiting_agreement` | `hasAgreementSigned` |
| **3** | Payment | `PENDING_PAYMENT` | `awaiting_payment` | `step3Complete` (= `isAgreementPaid`) |
| **4** | Documents | `PENDING_TODOS_COMPLETION` | `awaiting_documents` | `hasAllDocumentsAccepted` |
| **5** | Strategy | `PENDING_STRATEGY` → `PENDING_STRATEGY_REVIEW` → `COMPLETED` | `ready_for_strategy` → `awaiting_signature` → `active` | `step5Complete` |

---

## How Each Step's State Is Computed (in the hook)

### Step 1 — Account Created
- Always `true`. No condition.

### Step 2 — Agreement
- `hasAgreementSent` = any agreement is not `DRAFT` and not `CANCELLED`
- `hasAgreementSigned` = any agreement passes `isAgreementSigned()` (status is past `PENDING_SIGNATURE`) **OR** the SignatureAPI envelope status is `'completed'`
- `signedAgreement` = the first agreement found that is signed, or the active one if envelope says completed

### Step 3 — Payment
- `step3Sent` = `hasAgreementSigned && (hasPaymentSent || hasPaymentReceived)` — i.e., a charge exists
- `step3Complete` = `hasPaymentReceived` which checks `isAgreementPaid(signedAgreement.status)` — status is past `PENDING_PAYMENT`

### Step 4 — Documents
- `hasDocumentsRequested` = `totalDocTodos > 0` (todo items exist that aren't "sign" or "pay")
- `hasAllDocumentsUploaded` = every doc todo has `status === 'completed'` or `uploadStatus === 'FILE_UPLOADED'`
- `hasAllDocumentsAccepted` = every doc todo has `acceptanceStatus === ACCEPTED_BY_STRATEGIST`
- The **"Advance to strategy"** button appears when: `hasAllDocumentsAccepted && hasDocumentsRequested && signedAgreement.status === PENDING_TODOS_COMPLETION`

### Step 5 — Strategy
- `step5Sent` = `hasAllDocumentsAccepted && (strategyDoc.signatureStatus is 'SENT'|'SIGNED' OR strategyMetadata.sentAt exists)`
- `step5Signed` = `signedAgreement.status === PENDING_STRATEGY_REVIEW`
- `step5Complete` = `strategyDoc.signatureStatus === 'SIGNED' OR signedAgreement.status === COMPLETED`

---

## How `statusKey` Is Derived

Computed in `use-client-detail-data.ts` (~lines 430-436):

```
if (!hasAgreementSigned)            → 'awaiting_agreement'
else if (!step3Complete)            → 'awaiting_payment'
else if (!hasAllDocumentsAccepted)  → 'awaiting_documents'
else if (step5Complete)             → 'active'
else if (step5Sent)                 → 'awaiting_signature'
else                                → 'ready_for_strategy'
```

---

## What the UI Renders Per Step

Each step has **3 visual states** controlled by the boolean flags:

| Visual Element | Not Started | In Progress | Complete |
|---|---|---|---|
| **Dot** | `bg-zinc-300` | `bg-emerald-500` | `bg-emerald-500` |
| **Connecting line** | `bg-zinc-200` | `bg-zinc-200` | `bg-emerald-200` |
| **Title** | "X pending" | "X sent for Y" | "X completed" |
| **CTA button** | Primary green action | Secondary gray (resend/remind) | Hidden |

---

## Key Interactions (buttons that trigger status changes)

| Button | Visible When | Handler | Status Transition |
|---|---|---|---|
| **Send agreement** | Step 1 done, not signed | `handleSendAgreement` | Creates agreement → `PENDING_SIGNATURE` |
| **Resend agreement** | Sent but not signed | same | Re-sends |
| **Send payment link** | Signed, no charge exists | `handleSendPaymentLink` | Creates Stripe charge → `PENDING_PAYMENT` |
| **Send reminder** | Charge exists, not paid | `handleSendPaymentReminder` | Regenerates payment link |
| **Request documents** | Agreement signed | Opens `RequestDocumentsModal` | Creates todo items |
| **Accept / Decline** doc | Doc uploaded, pending review | `handleAcceptDocument` / `handleDeclineDocument` | Updates `acceptanceStatus` |
| **Advance to strategy** | All docs accepted + status is `PENDING_TODOS_COMPLETION` | `handleAdvanceToStrategy` | → `PENDING_STRATEGY` |
| **Create strategy** | Status is `PENDING_STRATEGY` | Opens `StrategySheet` | → `PENDING_STRATEGY_REVIEW` |
| **Finish Agreement** | Strategy signed (`PENDING_STRATEGY_REVIEW`) | `handleCompleteAgreement` | → `COMPLETED` |
| **Download signed doc** | Strategy signed | `handleDownloadSignedStrategy` | No status change |

---

## Two Sources of Truth for "Signed"

There's a **dual-check** for agreement signing:

1. **Backend status** — `isAgreementSigned(agreement.status)` checks the DB status
2. **SignatureAPI envelope** — `envelopeStatuses[agreementId] === 'completed'` checks the live envelope

If the envelope says completed but the DB hasn't caught up, the UI still shows "signed" and triggers a `refreshAgreements()` to sync.

---

## File References

| File | Purpose |
|---|---|
| `src/contexts/strategist-contexts/client-management/hooks/use-client-detail-data.ts` | All state, effects, computed flags, and handlers |
| `src/contexts/strategist-contexts/client-management/components/detail/activity-timeline.tsx` | Rendering the 5-step timeline UI |
| `src/types/agreement.ts` | `AgreementStatus` enum and lifecycle check functions |
| `src/types/document.ts` | `AcceptanceStatus` enum |
| `src/lib/client-status.ts` | `ClientStatusKey` type, `CLIENT_STATUS_CONFIG`, and timeline utilities |
| `src/contexts/strategist-contexts/client-management/utils/status-helpers.ts` | `computeClientStatus`, `canSendPaymentLink`, `canAdvanceToStrategy` |
