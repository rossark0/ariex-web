# Client Detail Page Refactoring Plan

## Problem

The strategist client detail page (`src/app/(app)/strategist/clients/[clientId]/page.tsx`) suffers from:

- **Slow runtime performance**: a 1,159-line "god hook" (`useClientDetailData`) with 34 `useState`, 11 `useEffect`, and 7 `useCallback` calls — every state change re-renders the entire page.
- **Slow HMR**: ~4,400 lines of statically-imported modules recompile on every save; heavy transitive deps (jsPDF 29 MB, html2canvas 4.4 MB, TipTap ~5 MB) widen the invalidation boundary.
- **Waterfall API calls**: 8+ network requests execute sequentially through cascading effects instead of in parallel.
- **Zero memoization**: no `useMemo`, no `React.memo` anywhere in the detail components.

---

## Architecture

### Current

```
page.tsx
  └─ useClientDetailData()          ← 1,159-line god hook, 34 useState, 11 useEffect
       ├─ 8 cascading API fetches (sequential)
       ├─ 20+ inline computed values (no useMemo)
       └─ returns ~60 fields
  └─ <ActivityTimeline />           ← 1,009 lines, 31 props, calls APIs directly
  └─ <DocumentsList />              ← 293 lines
  └─ <AgreementSelector />          ← 275 lines
  └─ 5× dynamic() heavy components (AgreementSheet 1,600 LOC, StrategySheet 1,498 LOC, …)
```

### Target

```
page.tsx                            ← ~50-line layout shell
  └─ useEffect → store.init(clientId)
  └─ Components subscribe to store slices via selectors

ClientDetailStore.ts                ← Zustand create() store with 7 slices
  ├─ clientSlice
  ├─ agreementsSlice
  ├─ signingSlice
  ├─ paymentSlice
  ├─ documentsSlice
  ├─ strategySlice
  └─ todoSlice

<ActivityTimeline />                ← ~80-line container
  ├─ <AccountCreatedStep />         ← subscribes to clientSlice
  ├─ <AgreementStep />              ← subscribes to agreementsSlice + signingSlice
  ├─ <PaymentStep />                ← subscribes to paymentSlice
  ├─ <DocumentsStep />              ← subscribes to documentsSlice + todoSlice
  └─ <StrategyStep />               ← subscribes to strategySlice
```

---

## Phases

### Phase 1 — Memoization & API Parallelization

> Goal: Immediate perf wins, no structural changes.

#### Steps

1. **Wrap computed values with `useMemo`** in `use-client-detail-data.ts` (lines 555–662):
   - `sortedAgreements`, `activeAgreement`, `allTodos`, `hasAgreementSent`, `hasAgreementSigned`, `signedAgreement`, `documentTodos`, `uploadedDocCount`, `acceptedDocCount`, `totalDocTodos`, `hasDocumentsRequested`, `hasAllDocumentsUploaded`, `hasAllDocumentsAccepted`, `todoTitles`, `step3Sent`, `step3Complete`, `strategyMetadata`, `step5State`, `step5Sent`, `step5Complete`, `strategyDoc`, `statusKey`
   - Deps: `agreements`, `selectedAgreementId`, `existingCharge`, `envelopeStatuses`, `clientDocuments`, `client`

2. **Parallelize independent API fetches**: after `agreements` loads, fire `loadDocuments` (E4), `fetchCharges` (E7), and `fetchSigningInfo` (E6) concurrently via `Promise.allSettled` in a single `useEffect` instead of 3 separate effects.

3. **Replace sequential envelope sync** (`for...of` + `await` in E5, lines 328–354) with `Promise.allSettled(agreements.map(...))`.

4. **Wrap child components with `React.memo()`**:
   - `ClientInfoCard`, `ClientHeader`, `AgreementSelector`, `DocumentsList`, `PaymentModal`, `DeleteTodoDialog`

5. **Stabilize callback references**: verify all `onX` prop handlers are wrapped in `useCallback`.

#### Verification

- No regressions in functionality (manual test).
- React DevTools Profiler confirms child components skip re-renders on unrelated state changes.
- Network tab shows parallel fetches instead of waterfall.

---

### Phase 2 — New Zustand Store + Remove Mock Layer ✅

> Goal: Replace the god hook with a Zustand React store; eliminate `FullClientMock` conversion; deprecate `ClientManagementStore`.
> **Status: COMPLETE**

#### Steps

1. **Create `ClientDetailStore.ts`** at `src/contexts/strategist-contexts/client-management/ClientDetailStore.ts` using `zustand`'s `create()` pattern (matching `AuthStore` / `ChatStore` conventions). Organize into slices:

   | Slice | State | Key Actions |
   |-------|-------|-------------|
   | `clientSlice` | `isLoading`, `apiClient` | `loadClient(clientId)` |
   | `agreementsSlice` | `agreements`, `isLoadingAgreements`, `agreementError`, `selectedAgreementId`, `isAgreementModalOpen` | `loadAgreements()`, `refreshAgreements()`, `sendAgreement()` |
   | `signingSlice` | `envelopeStatuses`, `strategistCeremonyUrl`, `strategistHasSigned`, `clientHasSigned`, `signedAgreementDocUrl` | `syncEnvelopeStatuses()`, `fetchSigningInfo()` |
   | `paymentSlice` | `existingCharge`, `isLoadingCharges`, `isPaymentModalOpen`, `isSendingPayment`, `paymentError`, `paymentAmount` | `fetchCharges()`, `sendPaymentLink()`, `sendPaymentReminder()` |
   | `documentsSlice` | `clientDocuments`, `isLoadingDocuments`, `selectedDocs`, `viewingDocId`, `isRequestDocsModalOpen` | `loadDocuments()`, `acceptDocument()`, `declineDocument()` |
   | `strategySlice` | `isStrategySheetOpen`, `isCompletingAgreement`, `strategyReviewPdfUrl`, `complianceUserId`, `complianceUsers`, `isStrategyReviewOpen` | `advanceToStrategy()`, `sendStrategy()`, `completeAgreement()` |
   | `todoSlice` | `todoToDelete`, `deletingTodoId` | `deleteTodo()` |

2. **Add computed selectors** as standalone functions:
   - `selectActiveAgreement(state)`, `selectSignedAgreement(state)`, `selectStatusKey(state)`, `selectStep5State(state)`, `selectDocumentTodos(state)`, etc.
   - Components use `useClientDetailStore(selectActiveAgreement)` for fine-grained subscriptions.

3. **Remove the `FullClientMock` conversion layer**:
   - Update `ActivityTimeline`, `StrategySheet`, and `page.tsx` to accept `ApiClient` instead of `FullClientMock`.
   - Remove `apiClientToMockFormat` from `client.model.ts`.
   - Remove `getFullClientById` import and mock fallback in client loading.

4. **Verify deprecated fields before removing**:
   - `grep -r "step5Signed" src/` — remove if no consumer reads as truthy.
   - `grep -r "StrategyMetadata" src/` — confirm all consumers use `strategy.model.ts` version.
   - `grep -r "strategyDoc" src/` — confirm `strategyApiDoc` is used instead.
   - Only remove after confirming zero functional impact.

5. **Rewrite `page.tsx`**: replace `useClientDetailData(params.clientId)` with a thin `useEffect` calling `store.init(clientId)`. Each child component uses `useClientDetailStore(selector)` directly.

6. **Mark `ClientManagementStore.ts` as `@deprecated`** — point to `ClientDetailStore`. Don't delete until confirmed unused.

7. **Update `useAiPageContext`** to read from new store selectors.

#### Verification

- Full manual test: agreement creation → signing → payment → document upload/accept/decline → strategy send → compliance review → chat.
- HMR test: editing a component should not recompile the entire hook.
- `grep -r "ClientManagementStore\|useClientManagement\|useClientDetailData\|FullClientMock\|apiClientToMockFormat" src/` — no stale references.
- `pnpm tsc --noEmit` passes.

---

### Phase 3 — Split ActivityTimeline + Component Cleanup

> Goal: Break the 1,009-line monolith into per-step components subscribing to their relevant store slices.

#### Steps

1. **Create step components** under `src/contexts/strategist-contexts/client-management/components/detail/tabs/`:

   | Component | Lines | Store Subscription |
   |-----------|-------|--------------------|
   | `AccountCreatedStep.tsx` | ~20 | `clientSlice` |
   | `AgreementStep.tsx` | ~160 | `agreementsSlice` + `signingSlice` |
   | `PaymentStep.tsx` | ~60 | `paymentSlice` |
   | `DocumentsStep.tsx` | ~250 | `documentsSlice` + `todoSlice` |
   | `StrategyStep.tsx` | ~220 | `strategySlice` |

2. **Lift API calls out of `ActivityTimeline`**:
   - Move `handleDownloadSignedAgreement` (lines 164–209) into `signingSlice`.
   - Move `handlePreviewDoc` into `documentsSlice`.
   - Move `findSignedAgreementByClientId` call into the store.

3. **Rewrite `activity-timeline.tsx`** as a ~80-line container rendering the 5 step components in a vertical timeline layout. Each step wrapped in `React.memo`.

4. **Add an error boundary** wrapping the page content in `page.tsx`.

5. **Final cleanup**:
   - Remove confirmed-unused deprecated fields from the store.
   - Delete `use-client-detail-data.ts`.
   - Delete `ClientManagementStore.ts` if grep confirms zero usage.

#### Verification

- Same full manual test as Phase 2.
- React DevTools Profiler: each step re-renders independently (accepting a document re-renders only `DocumentsStep`).
- HMR test: editing `PaymentStep.tsx` recompiles only that file.
- `pnpm tsc --noEmit` and `pnpm build` pass.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | New Zustand `create()` store | Matches `AuthStore`/`ChatStore` patterns; vanilla `ClientManagementStore` has non-standard subscription bugs |
| Mock layer | Remove `FullClientMock` entirely | Dual data model adds confusion; components should use `ApiClient` directly |
| Old store | Deprecate `ClientManagementStore` | Mirrors ~60% of the hook's state but is unused; new store replaces it |
| Deprecated fields | Remove only after grep verification | Refactor must not break any feature |
| Phasing | 3 incremental PRs | Each is self-contained and independently shippable |

## File Inventory

| File | Current LOC | Phase | Target LOC |
|------|-------------|-------|------------|
| `use-client-detail-data.ts` | 1,159 | Phase 2 (delete) | 0 |
| `ClientDetailStore.ts` | — | Phase 2 (create) | ~500 |
| `page.tsx` | 240 | Phase 2 | ~50 |
| `activity-timeline.tsx` | 1,009 | Phase 3 | ~80 |
| `AccountCreatedStep.tsx` | — | Phase 3 (create) | ~20 |
| `AgreementStep.tsx` | — | Phase 3 (create) | ~160 |
| `PaymentStep.tsx` | — | Phase 3 (create) | ~60 |
| `DocumentsStep.tsx` | — | Phase 3 (create) | ~250 |
| `StrategyStep.tsx` | — | Phase 3 (create) | ~220 |