# Implementation Plan — Strategy Compliance + Client Approval Flow

## Overview

Replace the current SignatureAPI signing flow in Step 5 with a sequential compliance → client approval flow. No backend status changes — we reuse `PENDING_STRATEGY` and `PENDING_STRATEGY_REVIEW`. Compliance and client decisions are tracked via the **document's `acceptanceStatus`** field (which already supports `ACCEPTED_BY_COMPLIANCE`, `REJECTED_BY_COMPLIANCE`, `ACCEPTED_BY_CLIENT`, `REJECTED_BY_CLIENT`).

---

## Phase 1: Data Layer — Types, Helpers, Metadata

### What to do
1. **Add strategy metadata type** with compliance/client tracking fields  
   - File: `src/contexts/strategist-contexts/client-management/models/strategy.model.ts` (new)
   - Contains: `StrategyMetadata` interface, helper functions to parse/serialize metadata

2. **Add Step 5 computed state helpers**  
   - File: `src/contexts/strategist-contexts/client-management/utils/status-helpers.ts` (update)
   - Add: `computeStep5State()` that reads the strategy document's `acceptanceStatus` + agreement metadata

3. **Verify `AcceptanceStatus` enum** already has what we need  
   - File: `src/types/document.ts` — already has `ACCEPTED_BY_COMPLIANCE`, `REJECTED_BY_COMPLIANCE`, `ACCEPTED_BY_CLIENT`, `REJECTED_BY_CLIENT`, `REQUEST_COMPLIANCE_ACCEPTANCE`, `REQUEST_CLIENT_ACCEPTANCE`

### Files touched
- `src/contexts/strategist-contexts/client-management/models/strategy.model.ts` (new)
- `src/contexts/strategist-contexts/client-management/utils/status-helpers.ts` (update)
- `src/types/document.ts` (verify only — no changes expected)

### How to test
- TypeScript compiles without errors (`pnpm tsc --noEmit`)
- Write a few manual test cases in a scratch file:
  ```ts
  computeStep5State({ acceptanceStatus: 'REQUEST_COMPLIANCE_ACCEPTANCE' })
  // → { complianceStatus: 'pending', clientStatus: 'not_started', phase: 'compliance_review' }
  ```

---

## Phase 2: Update `sendStrategyToClient` — Remove Signing, Add Compliance Flow

### What to do
1. **Rewrite `sendStrategyToClient`** in `src/lib/api/strategies.actions.ts`:
   - Keep: PDF upload to S3 (Step 1)
   - Remove: SignatureAPI envelope creation (Step 2)
   - Change: Set document `acceptanceStatus` to `REQUEST_COMPLIANCE_ACCEPTANCE`
   - Change: Store updated `__STRATEGY_METADATA__` (no envelope/ceremony fields, add `complianceStatus: 'pending'`)
   - Change: Transition agreement to `PENDING_STRATEGY_REVIEW` immediately (not after signing)

2. **Remove `getSignedStrategyUrl`** — no signed documents anymore

3. **Rewrite `completeAgreement`** — only fires when both compliance + client have approved

4. **Add new actions**:
   - `approveStrategyAsCompliance(documentId)` → sets `acceptanceStatus` to `ACCEPTED_BY_COMPLIANCE`, then to `REQUEST_CLIENT_ACCEPTANCE`
   - `rejectStrategyAsCompliance(documentId, reason)` → sets `acceptanceStatus` to `REJECTED_BY_COMPLIANCE`, agreement back to `PENDING_STRATEGY`
   - `approveStrategyAsClient(documentId)` → sets `acceptanceStatus` to `ACCEPTED_BY_CLIENT`, if compliance already approved → `COMPLETED`
   - `declineStrategyAsClient(documentId, reason)` → sets `acceptanceStatus` to `REJECTED_BY_CLIENT`, agreement back to `PENDING_STRATEGY`

### Files touched
- `src/lib/api/strategies.actions.ts` (major rewrite)
- `src/contexts/strategist-contexts/client-management/services/client.service.ts` (add wrappers)

### How to test
- Call `sendStrategyToClient()` → verify:
  - PDF uploads to S3 ✅
  - No SignatureAPI call ✅
  - Document `acceptanceStatus` = `REQUEST_COMPLIANCE_ACCEPTANCE` ✅
  - Agreement status = `PENDING_STRATEGY_REVIEW` ✅
- Call `approveStrategyAsCompliance()` → verify document status changes to `REQUEST_CLIENT_ACCEPTANCE`
- Call `rejectStrategyAsCompliance()` → verify agreement goes back to `PENDING_STRATEGY`

---

## Phase 3: Update Strategist Hook — Remove Signing Logic, Add New States

### What to do
1. **Update `use-client-detail-data.ts`**:
   - Remove: `step5Signed` (was `PENDING_STRATEGY_REVIEW` = client signed)
   - Remove: `handleDownloadSignedStrategy`
   - Remove: All SignatureAPI envelope status checks for strategy
   - Remove: `strategyCeremonyUrl` handling
   - Add: `complianceStatus` derived from strategy document's `acceptanceStatus`
   - Add: `clientDecision` derived from strategy document's `acceptanceStatus`
   - Rewrite `step5Sent`, `step5Complete` using new logic:
     - `step5Sent` = strategy document exists with `REQUEST_COMPLIANCE_ACCEPTANCE` or later
     - `step5ComplianceApproved` = document status is `ACCEPTED_BY_COMPLIANCE` or `REQUEST_CLIENT_ACCEPTANCE` or `ACCEPTED_BY_CLIENT`
     - `step5ComplianceRejected` = document status is `REJECTED_BY_COMPLIANCE`
     - `step5ClientApproved` = document status is `ACCEPTED_BY_CLIENT`
     - `step5ClientDeclined` = document status is `REJECTED_BY_CLIENT`
     - `step5Complete` = agreement status is `COMPLETED`
   - Add: `handleSendToCompliance` (replaces `handleSendStrategy` — same sheet, different destination)
   - Update: `handleCompleteAgreement` — auto-triggered or manual after both approve
   - Update: `statusKey` computation

2. **Update `ClientDetailData` interface** to expose new fields

### Files touched
- `src/contexts/strategist-contexts/client-management/hooks/use-client-detail-data.ts` (major update)

### How to test
- Navigate to a client in `PENDING_STRATEGY` state
- Console.log the derived states: `step5Sent`, `complianceStatus`, `clientDecision`
- Verify `statusKey` shows `ready_for_strategy`
- After sending strategy: verify `statusKey` changes to `awaiting_compliance`
- After compliance approves: verify states update correctly
- After client approves: verify `statusKey` → `active`

---

## Phase 4: Update Strategist Timeline UI — Step 5

### What to do
1. **Rewrite Step 5 in `activity-timeline.tsx`**:
   - Remove: "Download signed document" button
   - Remove: "Sign strategy" ceremony URL logic
   - Add: Compliance review sub-step showing approval/rejection status
   - Add: Client review sub-step showing approval/decline status
   - Update button labels:
     - `PENDING_STRATEGY` (fresh) → **"Create strategy"**
     - `PENDING_STRATEGY` (after rejection) → **"Revise strategy"** + rejection reason + who rejected
     - `PENDING_STRATEGY_REVIEW` (compliance pending) → "Awaiting compliance review" (no button)
     - `PENDING_STRATEGY_REVIEW` (compliance ✅, client pending) → "Compliance approved ✅ · Awaiting client approval" (no button)
     - `COMPLETED` → "✓ Strategy complete" + **"View strategy"**

2. **Update `ActivityTimelineProps`** interface — remove signing props, add compliance/client status props

### Files touched
- `src/contexts/strategist-contexts/client-management/components/detail/activity-timeline.tsx` (Step 5 section rewrite)

### How to test
- Navigate to client detail page as strategist
- At `PENDING_STRATEGY`: see "Create strategy" button → click → strategy sheet opens
- After sending: see "Awaiting compliance review" (no button)
- Manually change document acceptance to `ACCEPTED_BY_COMPLIANCE` → see "Compliance approved ✅ · Awaiting client approval"
- Manually change to `REJECTED_BY_COMPLIANCE` → see "Compliance rejected ❌" + "Revise strategy" button
- At `COMPLETED`: see "✓ Strategy complete" + "View strategy"

---

## Phase 5: Update Client Timeline — Step 5

### What to do
1. **Rewrite Step 5 in `src/app/(app)/client/home/page.tsx`**:
   - Remove: `strategyCeremonyUrl`, `strategyDocumentId` from metadata parsing
   - Remove: "Sign strategy" button
   - Remove: `syncStrategySignatureStatus` call on `?strategy_signed=true`
   - Remove: `step5ClientSigned` concept
   - Add: Strategy only visible to client after compliance approved (check `acceptanceStatus`)
   - Add: **"Approve"** / **"Decline"** buttons (when compliance approved + client hasn't decided)
   - Add: Decline reason modal/input
   - Rewrite computed states:
     - Client sees "being prepared" when: `PENDING_STRATEGY` OR `PENDING_STRATEGY_REVIEW` + compliance hasn't approved
     - Client sees "ready for review" when: `PENDING_STRATEGY_REVIEW` + compliance approved
     - Client sees "approved ✓" when: `COMPLETED`
   - Add: Call `approveStrategyAsClient` / `declineStrategyAsClient` from buttons

2. **Add client API functions** for approving/declining strategy
   - File: `src/lib/api/client.api.ts` — add `approveStrategy(documentId)`, `declineStrategy(documentId, reason)`

### Files touched
- `src/app/(app)/client/home/page.tsx` (Step 5 section rewrite)
- `src/lib/api/client.api.ts` (add approval functions)

### How to test
- Log in as client
- At `PENDING_STRATEGY`: see "Your tax strategy is being prepared"
- At `PENDING_STRATEGY_REVIEW` but compliance pending: still see "being prepared"
- At `PENDING_STRATEGY_REVIEW` + compliance approved: see "Strategy ready for review" + **Approve** / **Decline** buttons + **View strategy** button
- Click Approve → see "Strategy approved ✓" + verify agreement → `COMPLETED`
- Click Decline → see "Your strategist is revising your strategy" + verify agreement → `PENDING_STRATEGY`

---

## Phase 6: Cleanup & Polish

### What to do
1. **Remove dead code**:
   - `handleDownloadSignedStrategy` from hook
   - `getSignedStrategyUrl` from strategies.actions.ts
   - `syncStrategySignatureStatus` calls from client home page
   - `?strategy_signed=true` URL parameter handling
   - `strategyCeremonyUrl` references everywhere
   - `step5Signed` from hook and timeline props

2. **Update `CLIENT_STATUS_CONFIG`**:
   - Rename `awaiting_signature` → `awaiting_approval` (or keep and reuse)
   - Add `awaiting_compliance` status key + config (label: "strategy · compliance review")

3. **Update `statusKey` logic** in hook:
   ```
   if (!hasAgreementSigned)            → 'awaiting_agreement'
   else if (!step3Complete)            → 'awaiting_payment'
   else if (!hasAllDocumentsAccepted)  → 'awaiting_documents'
   else if (step5Complete)             → 'active'
   else if (step5ClientPending)        → 'awaiting_approval'
   else if (step5CompliancePending)    → 'awaiting_compliance'
   else                                → 'ready_for_strategy'
   ```

4. **Update the activity-timeline markdown doc** with final flow

### Files touched
- Multiple files (cleanup across codebase)
- `src/lib/client-status.ts` (add/rename status keys)
- `src/contexts/strategist-contexts/client-management/hooks/use-client-detail-data.ts` (statusKey)

### How to test
- Full end-to-end flow:
  1. Strategist creates strategy → sends → status shows "awaiting compliance"
  2. Compliance approves → status shows "awaiting approval"
  3. Client approves → status shows "active" → agreement `COMPLETED`
- Rejection flows:
  4. Compliance rejects → back to "ready for strategy" → strategist revises
  5. Client declines → back to "ready for strategy" → strategist revises → compliance re-reviews
- Verify no SignatureAPI references remain in Step 5 flow
- Verify `pnpm tsc --noEmit` passes
- Verify no console errors in browser

---

## Document `acceptanceStatus` Lifecycle

```
[Strategy created]
  → REQUEST_COMPLIANCE_ACCEPTANCE        (agreement: PENDING_STRATEGY_REVIEW)

[Compliance approves]
  → ACCEPTED_BY_COMPLIANCE               (agreement: stays PENDING_STRATEGY_REVIEW)
  → then auto-set to REQUEST_CLIENT_ACCEPTANCE

[Compliance rejects]
  → REJECTED_BY_COMPLIANCE               (agreement: back to PENDING_STRATEGY)

[Client approves]
  → ACCEPTED_BY_CLIENT                   (agreement: → COMPLETED)

[Client declines]
  → REJECTED_BY_CLIENT                   (agreement: back to PENDING_STRATEGY)
```

---

## Phase Summary

| Phase | Focus | Risk | Estimate |
|-------|-------|------|----------|
| 1 | Types & helpers | Low | Small |
| 2 | Server actions (remove signing, add approval) | Medium | Medium |
| 3 | Strategist hook (state rewrite) | Medium | Medium |
| 4 | Strategist timeline UI | Low | Medium |
| 5 | Client timeline UI | Medium | Medium |
| 6 | Cleanup & polish | Low | Small |
