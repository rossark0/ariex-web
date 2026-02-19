# Compliance Integration Plan — Revised Status

> **Created:** February 16, 2026
> **Last Revised:** February 16, 2026
> **Status:** Mostly implemented — see status per phase below
> **Priority:** High — Core feature for production launch

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Endpoints Reference](#api-endpoints-reference)
4. [Implementation Status Summary](#implementation-status-summary)
5. [Phase 0: Strategist Invites Compliance](#phase-0--strategist-invites-compliance-user) — ✅ DONE
6. [Phase 1: Compliance Onboarding](#phase-1--compliance-onboarding-accept-invitation) — ✅ DONE
7. [Phase 2: API Service Layer](#phase-2--api-service-layer) — ✅ DONE
8. [Phase 3: Context + Store + Hooks](#phase-3--context--store--hooks) — ✅ DONE
9. [Phase 4: Strategists Pages](#phase-4--strategists-pages-real-data) — ✅ DONE
10. [Phase 5: Client Detail + Strategy Review](#phase-5--client-detail-page--strategy-review) — ✅ DONE
11. [Phase 6: Comments System](#phase-6--comments-system) — ✅ DONE
12. [Phase 7: AI Assistant + Polish](#phase-7--ai-assistant--polish) — ⚠️ PARTIAL
13. [Remaining Work](#remaining-work)
14. [Testing Checklist](#testing-checklist)

---

## Overview

### What is Compliance?

Compliance is the **quality gate** for tax strategies in the Ariex platform. Their primary function:

> **Review and approve/reject strategy documents** before they reach the client.

### The Full Lifecycle

```
Strategist creates client → Client onboards → Strategist writes strategy
    → Strategy sent to Compliance → Compliance approves ✅ or rejects ❌
    → If approved → Client sees strategy → Client accepts or denies
    → If both approve → Agreement COMPLETED
```

### Compliance User Responsibilities

| Action | Type | Status |
|--------|------|--------|
| View all strategists in scope | **Read-only** | ✅ Implemented |
| View strategist's client list | **Read-only** | ✅ Implemented |
| View client detail (info, timeline, documents, payments, todos) | **Read-only** | ✅ Implemented |
| Review strategy document (PDF) | **Read-only** | ✅ Implemented |
| Approve strategy | **Write** | ✅ Implemented |
| Reject strategy (with reason) | **Write** | ✅ Implemented |
| Leave comments on strategy/documents | **Write** | ✅ Implemented |
| AI assistant chat | **Write** | ⚠️ Partial — chatbot renders but compliance-specific endpoints not wired |

### How Compliance Users Are Created

**Compliance users are invited by Strategists** (not self-registered, not admin-created):

1. Strategist calls `POST /users/compliance/invite` with compliance email — ✅
2. Backend creates Cognito user with `COMPLIANCE` role + sends temp password email — ✅
3. Backend returns invitation `token` for scope vinculation — ✅
4. Compliance logs in → `/complete-password` → sets new password — ✅
5. Compliance lands on `/compliance/strategists?token=xxx` → auto-calls `POST /compliance/add/strategist` — ✅
6. Compliance now sees that strategist's clients — ✅

---

## Architecture

### Flow Diagram

```
STRATEGIST                          BACKEND                         COMPLIANCE
    │                                                                   │
    │  1. POST /users/compliance/invite                                 │
    │     { email, profileData?, clientIds? }                           │
    │  ──────────────────────────────────►                              │
    │                                    Creates Cognito user           │
    │                                    Returns { token,               │
    │                                      complianceUserId,            │
    │                                      strategistUserId,            │
    │                                      expiresAt }                  │
    │                                                                   │
    │                                    📧 Email with temp password ──►│
    │                                                                   │
    │                                                       2. Login    │
    │                                                  /complete-password│
    │                                                                   │
    │                              3. POST /compliance/add/strategist   │
    │                                 { token }                     ◄───│
    │                                 Links strategist to scope         │
    │                                                                   │
    │                              4. GET /compliance/get-strategists   │
    │                                                               ◄───│
    │                              5. GET /compliance/get-clients       │
    │                                 ?strategistUserId=xxx         ◄───│
    │                              6. Read agreements, docs, todos  ◄───│
    │                              7. Approve/reject strategy       ◄───│
    │                              8. POST /compliance/add-comment  ◄───│
```

### Document AcceptanceStatus Lifecycle (Strategy)

```
[Strategy created by strategist]
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

### Implemented File Structure

```
src/
├── lib/api/
│   ├── compliance.api.ts                        ✅ 580+ lines, 26+ server functions
│   └── strategist.api.ts                        ✅ inviteComplianceUser() added
├── contexts/compliance/                         ✅ Full context
│   ├── ComplianceStore.ts                       ✅ 176 lines — Zustand vanilla store
│   ├── hooks/
│   │   ├── use-compliance-strategists.ts        ✅ List + search + filter
│   │   ├── use-compliance-strategist-detail.ts  ✅ Detail + clients + grouping
│   │   └── use-compliance-client-detail.ts      ✅ Full detail + approve/reject actions
│   ├── models/
│   │   └── compliance.model.ts                  ✅ 210 lines — View models, timeline, status
│   └── services/
│       └── compliance.service.ts                ✅ 306 lines — All service orchestrators
├── app/(app)/compliance/
│   ├── layout.tsx                               ✅ Nav items: Home, Strategists, Support
│   ├── home/page.tsx                            ✅ Real data — stats + strategist list
│   ├── dashboard/page.tsx                       ⚠️ MOCK data — legacy page, not in nav
│   ├── strategists/
│   │   ├── page.tsx                             ✅ Real data + token acceptance banner
│   │   ├── [strategistId]/page.tsx              ✅ Real data + client grouping by status
│   │   ├── components/                          ✅ StatusBadge, DetailRow, etc.
│   │   └── utils/                               ✅ Utility helpers
│   └── clients/
│       └── [clientId]/page.tsx                  ✅ 1124 lines — Full detail with:
│                                                    - RejectStrategyModal
│                                                    - ApproveStrategyModal
│                                                    - CommentsPanel
│                                                    - Timeline, documents, todos
└── app/(app)/strategist/
    └── clients/page.tsx                         ✅ InviteComplianceModal added
```

---

## API Endpoints Reference

### Compliance-Specific Endpoints (15 total)

| # | Method | Endpoint | Purpose | API Function | Status |
|---|--------|----------|---------|--------------|--------|
| 1 | `GET` | `/compliance/strategist/allowed-compliance` | List compliance users linked to strategist | `getLinkedComplianceUsers()` | ✅ |
| 2 | `DELETE` | `/compliance/strategist/allowed-compliance/{id}` | Remove compliance from strategist scope | `removeComplianceUser()` | ✅ |
| 3 | `POST` | `/compliance/add/strategist` | Accept invitation, link strategist to scope | `acceptComplianceInvitation()` | ✅ |
| 4 | `GET` | `/compliance/get-strategists` | List strategists in compliance scope | `getComplianceStrategists()` | ✅ |
| 5 | `GET` | `/compliance/get-strategists/{id}` | Get strategist by ID in scope | `getComplianceStrategistById()` | ✅ |
| 6 | `POST` | `/compliance/add-comment` | Add comment on strategist/document | `addComplianceComment()` | ✅ |
| 7 | `POST` | `/compliance/add/client` | Add client to compliance scope | `addClientToScope()` | ✅ |
| 8 | `GET` | `/compliance/get-clients` | List clients in scope | `getComplianceClients()` | ✅ |
| 9 | `GET` | `/compliance/get-clients/{id}` | Get client by ID in scope | `getComplianceClientById()` | ✅ |
| 10 | `GET` | `/compliance/strategists/{id}/agreements` | List strategist's agreements | `getStrategistAgreements()` | ✅ |
| 11 | `GET` | `/compliance/agreements/{id}` | Get agreement detail | `getComplianceAgreement()` | ✅ |
| 12 | `GET` | `/compliance/agreements/{id}/documents` | List agreement documents | `getAgreementDocuments()` | ✅ |
| 13 | `GET` | `/compliance/agreements/{id}/files` | List file metadata for agreement | `getAgreementFiles()` | ✅ |
| 14 | `GET` | `/compliance/agreements/{id}/todo-lists` | List todo lists for agreement | `getAgreementTodoLists()` | ✅ |
| 15 | `GET` | `/compliance/agreements/{id}/todos` | List todos for agreement | `getAgreementTodos()` | ✅ |

### Document Endpoints (Compliance-Scoped)

| # | Method | Endpoint | Purpose | API Function | Status |
|---|--------|----------|---------|--------------|--------|
| 16 | `GET` | `/compliance/documents/{id}` | Get document by ID within compliance scope | `getComplianceDocument()` | ✅ |
| 17 | `PATCH` | `/compliance/documents/{id}` | Update document acceptance status | `updateComplianceDocumentAcceptance()` | ✅ |
| 18 | `GET` | `/compliance/documents/{id}` | Get document download URL | `getComplianceDocumentUrl()` | ✅ |

### User/Invite Endpoints (Used by Strategist)

| # | Method | Endpoint | Purpose | API Function | Status |
|---|--------|----------|---------|--------------|--------|
| 19 | `POST` | `/users/compliance/invite` | Invite compliance user | `inviteComplianceUser()` | ✅ |
| 20 | `POST` | `/users/strategist/{id}/clients` | Update client access for compliance user | `updateComplianceClientAccess()` | ✅ |

### Profile Endpoints

| # | Method | Endpoint | Purpose | API Function | Status |
|---|--------|----------|---------|--------------|--------|
| 21 | `POST` | `/users/{id}/compliance-profile` | Create/update compliance profile | `updateComplianceProfile()` | ✅ |
| 22 | `GET` | `/users/{id}/compliance-profile` | Get compliance profile | `getComplianceProfile()` | ✅ |

### AI Assistant Endpoints

| # | Method | Endpoint | Purpose | API Function | Status |
|---|--------|----------|---------|--------------|--------|
| 23 | `POST` | `/assistants/compliance/chats` | Create compliance AI chat | `createComplianceChat()` | ✅ API fn exists |
| 24 | `POST` | `/assistants/compliance/chats/{id}/messages` | Send message to compliance AI | `sendComplianceChatMessage()` | ✅ API fn exists |

> **Note:** AI API functions exist in `compliance.api.ts` but are **not yet wired** into `AiFloatingChatbot`. The chatbot renders on compliance pages but uses the generic AI context, not compliance-specific endpoints.

### Comment Endpoints (Generic)

| # | Method | Endpoint | Purpose | API Function | Status |
|---|--------|----------|---------|--------------|--------|
| 25 | `POST` | `/comment/{documentId}` | Create comment on a document | — | Available |
| 26 | `GET` | `/comment` | List comments | `getDocumentComments()` | ✅ |
| 27 | `GET` | `/comment/{id}` | Get single comment | — | Available |
| 28 | `PATCH` | `/comment/{id}` | Update comment | — | Available |
| 29 | `DELETE` | `/comment/{id}` | Delete comment | — | Available |

---

## Implementation Status Summary

| Phase | Description | Status | Key Files |
|-------|-------------|--------|-----------|
| **0** | Strategist Invites Compliance | ✅ **DONE** | `strategist.api.ts`, `strategist/clients/page.tsx` |
| **1** | Compliance Onboarding | ✅ **DONE** | `strategists/page.tsx` (token acceptance) |
| **2** | API Service Layer | ✅ **DONE** | `compliance.api.ts` (503 lines, 24+ fns) |
| **3** | Context + Store + Hooks | ✅ **DONE** | `ComplianceStore.ts`, 3 hooks, model, service |
| **4** | Strategists Pages (real data) | ✅ **DONE** | `strategists/page.tsx`, `[strategistId]/page.tsx` |
| **5** | Client Detail + Strategy Review | ✅ **DONE** | `clients/[clientId]/page.tsx` (1124 lines) |
| **6** | Comments System | ✅ **DONE** | `CommentsPanel` in client detail, `addComment` service |
| **7** | AI Assistant + Polish | ⚠️ **PARTIAL** | Chatbot renders, endpoints coded, not wired |

---

## Phase 0 — Strategist Invites Compliance User ✅ DONE

### What Was Implemented

- **`inviteComplianceUser()`** in `src/lib/api/strategist.api.ts` — calls `POST /users/compliance/invite`
- **`InviteComplianceModal`** component inline in `src/app/(app)/strategist/clients/page.tsx`:
  - Email input field
  - Calls `inviteComplianceUser({ email })`
  - Shows success/error states
- **"Invite Compliance" button** in strategist clients page header
- **`getLinkedComplianceUsers()`** and **`removeComplianceUser()`** in `compliance.api.ts`
- **`updateComplianceClientAccess()`** in `compliance.api.ts`

### Not Yet Implemented (Optional Enhancements)

- Pre-selecting which clients the compliance user can see during invite
- Dedicated compliance team management page at `/strategist/settings`

---

## Phase 1 — Compliance Onboarding (Accept Invitation) ✅ DONE

### What Was Implemented

- Token acceptance flow in `src/app/(app)/compliance/strategists/page.tsx`:
  - Detects `?token=xxx` query param on mount
  - Calls `acceptInvitation(token)` from `compliance.service.ts`
  - Shows `TokenBanner` with loading/success/error states
  - Cleans URL after acceptance via `window.history.replaceState()`
  - Refreshes strategists list after success
- `acceptComplianceInvitation()` in `compliance.api.ts` calls `POST /compliance/add/strategist`
- Profile endpoints (`updateComplianceProfile`, `getComplianceProfile`) in `compliance.api.ts`
- Login → `/complete-password` → redirect to `/compliance/strategists` flow works via existing auth infrastructure

---

## Phase 2 — API Service Layer ✅ DONE

### File: `src/lib/api/compliance.api.ts` — 580+ lines

All endpoints are wrapped with proper auth token handling. Full function list:

| Section | Functions |
|---------|-----------|
| **Invitation** | `inviteComplianceUser`, `acceptComplianceInvitation` |
| **Profile** | `updateComplianceProfile`, `getComplianceProfile` |
| **Strategists** | `getComplianceStrategists`, `getComplianceStrategistById` |
| **Clients** | `getComplianceClients`, `getComplianceClientById` |
| **Scope Mgmt** | `addClientToScope`, `getLinkedComplianceUsers`, `removeComplianceUser` |
| **Agreements** | `getStrategistAgreements`, `getComplianceAgreement` |
| **Docs & Files** | `getAgreementDocuments`, `getAgreementFiles`, `getComplianceDocument`, `getComplianceDocumentUrl` |
| **Document Actions** | `updateComplianceDocumentAcceptance` |
| **Todos** | `getAgreementTodoLists`, `getAgreementTodos` |
| **Comments** | `addComplianceComment`, `getDocumentComments` |
| **AI** | `createComplianceChat`, `sendComplianceChatMessage` |
| **Access Control** | `updateComplianceClientAccess` |

### Types defined in compliance.api.ts

- `ComplianceStrategist`
- `ComplianceStrategistMapping`
- `ComplianceClientMapping`
- `ComplianceComment`
- `ComplianceInvitationResponse`
- `ComplianceProfile`
- `FileMetadata`

---

## Phase 3 — Context + Store + Hooks ✅ DONE

### Store: `src/contexts/compliance/ComplianceStore.ts` — 176 lines

Zustand vanilla store with state for:
- Strategists list and views
- Selected strategist detail
- Clients list and views (scoped to a strategist)
- Full client detail (agreement, documents, files, todo lists, todos, strategy document)
- Comments
- All setter actions + `reset()` and `resetClientDetail()`

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useComplianceStrategists` | `hooks/use-compliance-strategists.ts` | Fetch on mount, search/filter |
| `useComplianceStrategistDetail` | `hooks/use-compliance-strategist-detail.ts` | Strategist detail + client list + grouping by status |
| `useComplianceClientDetail` | `hooks/use-compliance-client-detail.ts` | Full client detail fetch, timeline computation, approve/reject/comment actions, PDF URL loading |

### Models: `models/compliance.model.ts` — 210 lines

- `ComplianceStrategistView` — view model with `toStrategistView()` mapper
- `ComplianceClientView` — view model with `toClientView()` mapper
- `computeClientStatusKey()` — derives status from agreement + acceptance status
- `ComplianceClientDetail` — aggregate interface
- `findStrategyDocument()` — finds strategy doc from document list
- `RealTimelineState` — timeline computation interface
- `computeTimelineState()` — derives all 5 steps from real API data

### Service: `services/compliance.service.ts` — 306 lines

| Function | Purpose |
|----------|---------|
| `fetchStrategists()` | Load strategists → compute views → update store |
| `fetchStrategistDetail()` | Load single strategist → update store |
| `fetchClients()` | Load clients + agreements → compute views with status → update store |
| `fetchClientDetail()` | Load client + agreement + docs + files + todos → find strategy doc → update store |
| `approveStrategy()` | Call `approveStrategyAsCompliance()` + refresh client detail |
| `rejectStrategy()` | Call `rejectStrategyAsCompliance()` + update agreement status + refresh |
| `fetchComments()` | Load comments for a document → update store |
| `addComment()` | Add comment via compliance endpoint → update store |
| `acceptInvitation()` | Accept invitation token → return success/failure |

---

## Phase 4 — Strategists Pages (Real Data) ✅ DONE

### `/compliance/strategists` — List Page (246 lines)

- Uses `useComplianceStrategists()` hook
- `StrategistCard` component renders real `ComplianceStrategistView` data
- Search/filter with real data
- Token acceptance `TokenBanner` (loading/success/error)
- Empty state when no strategists linked
- Error state with retry button
- Loading skeleton

### `/compliance/strategists/[strategistId]` — Detail Page (428 lines)

- Uses `useComplianceStrategistDetail(strategistId)` hook
- `ClientItemReal` component with real `ComplianceClientView` data
- Client grouping by status categories (awaiting compliance, awaiting approval, ready for strategy, active, in progress)
- Uses shared `StatusBadge`, `DetailRow` components
- Search/filter within client list

### `/compliance/home` — Home Page (226 lines)

- Uses `useComplianceStrategists()` hook for real data
- Stats grid: total strategists, total clients (computed from real data)
- Strategist rows with clickable navigation
- AI chatbot renders via `AiFloatingChatbot`

---

## Phase 5 — Client Detail Page + Strategy Review ✅ DONE

### `/compliance/clients/[clientId]` — 1124 lines

All sections from the original plan are implemented:

| Section | Implementation |
|---------|----------------|
| **Client Info Card** | ✅ Name, email, phone, business, filing status, dependents, income |
| **Status Badge** | ✅ `CLIENT_STATUS_CONFIG[statusKey]` from timeline computation |
| **Timeline (5 steps)** | ✅ `computeTimelineState()` — real data derivation |
| **Strategy Review Panel** | ✅ PDF URL loading via `getStrategyDocumentUrl()`, document preview |
| **Approve Strategy** | ✅ `ApproveStrategyModal` with confirmation dialog |
| **Reject Strategy** | ✅ `RejectStrategyModal` with reason textarea |
| **Documents Section** | ✅ Documents list with status badges, grouped by date |
| **Todos Section** | ✅ Todo lists with completion tracking |
| **Comments Panel** | ✅ `CommentsPanel` with add/list comments |

### Data Flow (Implemented)

```typescript
// In use-compliance-client-detail.ts:
// 1. fetchClientDetail(clientId, strategistId) orchestrates:
//    - getComplianceClientById()
//    - getStrategistAgreements() → find client's agreement
//    - getAgreementDocuments() → find strategy doc
//    - getAgreementFiles()
//    - getAgreementTodoLists()
//    - getAgreementTodos()
// 2. computeTimelineState() derives all 5 steps
// 3. Approve/reject use existing strategies.actions.ts server actions
// 4. Comments fetched when strategy document is found
// 5. PDF URL loaded via getStrategyDocumentUrl()
```

---

## Phase 6 — Comments System ✅ DONE

### Implementation

- **`CommentsPanel`** component inline in `clients/[clientId]/page.tsx`
  - Renders comment thread with timestamp and body
  - "Add comment" input with submit button
  - Loading state handling
- **`addComplianceComment()`** in `compliance.api.ts` — calls `POST /compliance/add-comment`
- **`getDocumentComments()`** in `compliance.api.ts` — fetches comments for a document
- **`addComment()`** service in `compliance.service.ts` — orchestrates API call + store update
- **`fetchComments()`** service — loads comments when strategy document is found
- Comments linked to strategy document via `documentId`

---

## Phase 7 — AI Assistant + Polish ⚠️ PARTIAL

### ✅ Done

| Item | Status |
|------|--------|
| **`AiFloatingChatbot` renders** on all compliance pages | ✅ |
| **AI page context detection** — `use-ai-page-context.ts` detects compliance routes | ✅ |
| **API functions** — `createComplianceChat()`, `sendComplianceChatMessage()` in `compliance.api.ts` | ✅ |
| **Layout navigation** — Home, Strategists, Support nav items | ✅ |
| **Loading skeletons** on all pages | ✅ |
| **Error states** with retry buttons on all pages | ✅ |
| **Empty states** with helpful messaging | ✅ |

### ❌ Not Yet Done

| Item | Description |
|------|-------------|
| **AI chat compliance endpoint wiring** | `AiFloatingChatbot` uses the generic AI context. Compliance-specific endpoints (`/assistants/compliance/chats`) are coded in `compliance.api.ts` but not wired into the AI chat system to be used when `userRole === 'COMPLIANCE'`. |
| **Dashboard page migration** | `dashboard/page.tsx` (203 lines) still uses **hardcoded mock data** — hardcoded strategist names, activity rows, review items. This page is NOT in the nav (home replaces it), but it still exists at `/compliance/dashboard`. Decision: either delete it or wire it to real data. |
| **Toast notifications** on approve/reject | Currently no toast feedback — actions succeed silently (modals close but no toast). |

---

## Remaining Work

### Priority 1: AI Chat Compliance Endpoints

**Goal:** When a COMPLIANCE user uses the AI chatbot, it should call the compliance-specific endpoints instead of generic ones.

**Files to modify:**
- `src/contexts/ai/` — detect `COMPLIANCE` role and route to compliance chat endpoints
- Wire `createComplianceChat()` and `sendComplianceChatMessage()` from `compliance.api.ts`

**Effort:** Small (~1-2 hours)

---

### Priority 2: Dashboard Page Decision

**Options:**
1. **Delete** `dashboard/page.tsx` — it's a duplicate of `home/page.tsx` with mock data, not in nav
2. **Merge** unique dashboard features (pending reviews list, activity feed) into `home/page.tsx`

**Current state:**
- `home/page.tsx` — ✅ real data, shows stats + strategist list
- `dashboard/page.tsx` — ❌ mock data, shows stats + strategists + activity + pending reviews

**Recommendation:** Option 2 — add a "Pending Reviews" section to `home/page.tsx` that aggregates strategies awaiting compliance review across all strategists, then delete `dashboard/page.tsx`.

**Effort:** Medium (~2-3 hours)

---

### Priority 3: Toast Notifications (Optional Polish)

Add toast notifications for:
- Strategy approved successfully
- Strategy rejected successfully
- Comment added successfully
- Invitation accepted successfully

**Effort:** Small (~30 min)

---

### Priority 4: Component Extraction (Optional Refactor)

The original plan proposed a `src/contexts/compliance/components/` folder. Currently, components are inline in their respective pages:

| Component | Current Location | Could Extract To |
|-----------|-----------------|-----------------|
| `RejectStrategyModal` | `clients/[clientId]/page.tsx` | `components/detail/reject-strategy-modal.tsx` |
| `ApproveStrategyModal` | `clients/[clientId]/page.tsx` | `components/detail/approve-strategy-modal.tsx` |
| `CommentsPanel` | `clients/[clientId]/page.tsx` | `components/detail/comments-panel.tsx` |
| `StrategistCard` | `strategists/page.tsx` | `components/shared/strategist-card.tsx` |
| `TokenBanner` | `strategists/page.tsx` | `components/shared/token-banner.tsx` |

**Recommendation:** Only extract if these components need to be reused elsewhere. Current inline approach is functional.

**Effort:** Small (~1-2 hours)

---

## Testing Checklist

### End-to-End Flow

- [x] **Strategist invites compliance user** via modal on `/strategist/clients`
- [x] **Compliance receives email** with temp password
- [x] **Compliance logs in** → complete password challenge
- [x] **Compliance accepts invitation** (token vinculation via `?token=xxx`)
- [x] **Compliance sees strategist** in strategists list
- [x] **Compliance clicks strategist** → sees their clients grouped by status
- [x] **Compliance clicks client** → sees full detail (read-only)
- [x] **Timeline steps 1-4** show correct computed states
- [x] **Step 5: Strategy not sent** → shows "not submitted" state
- [x] **Strategist sends strategy** → compliance sees "review" state
- [x] **Compliance views strategy PDF** in read-only viewer
- [x] **Compliance approves** → status changes to "awaiting client"
- [x] **Compliance rejects with reason** → status reverts, reason stored
- [x] **After rejection: Strategist revises & resends** → compliance reviews again
- [x] **Client approves after compliance** → agreement COMPLETED
- [x] **Comments: Compliance adds comment** → visible to strategist
- [ ] **AI chatbot works** for compliance user (partially — renders but uses generic endpoints)
- [x] **Route protection works** — compliance can't access strategist/client/admin routes
- [x] **Multiple strategists** — compliance can be linked to multiple strategists
- [x] **Strategist removes compliance** — API function exists (`removeComplianceUser`)

### Edge Cases

- [x] Compliance user with no strategists linked (empty state with helpful message)
- [x] Strategist with no clients (empty state on strategist detail)
- [x] Client with no agreement yet (handled by `computeTimelineState()`)
- [ ] Strategy document rejected multiple times (history preserved) — needs verification
- [x] Expired invitation token (error state shown via `TokenBanner`)
- [x] Two compliance users reviewing same strategy — API supports it

---

## Key DTOs from Swagger

### InviteComplianceDto
```json
{
  "email": "string (required, format: email)",
  "profileData": "object (optional)",
  "clientIds": ["string (uuid)"]
}
```

### ComplianceInvitationResponseDto
```json
{
  "token": "string (required)",
  "complianceUserId": "string (uuid, required)",
  "strategistUserId": "string (uuid, required)",
  "expiresAt": "date-time (required)",
  "message": "string (required)"
}
```

### AcceptComplianceInvitationDto
```json
{
  "token": "string (required)"
}
```

### CreateComplianceCommentDto
```json
{
  "strategistUserId": "string (uuid, required)",
  "documentId": "string (uuid, optional)",
  "body": "string (required)"
}
```

### CreateComplianceClientDto
```json
{
  "strategistUserId": "string (uuid, required)",
  "clientUserId": "string (uuid, required)"
}
```

### ComplianceStrategistModel
```json
{
  "id": "uuid",
  "complianceUserId": "uuid",
  "strategistUserId": "uuid",
  "createdAt": "date-time",
  "updatedAt": "date-time"
}
```

### ComplianceClientModel
```json
{
  "id": "uuid",
  "complianceUserId": "uuid",
  "strategistUserId": "uuid",
  "clientUserId": "uuid",
  "createdAt": "date-time",
  "updatedAt": "date-time"
}
```

### ComplianceCommentModel
```json
{
  "id": "uuid",
  "complianceUserId": "uuid",
  "strategistUserId": "uuid",
  "documentId": "uuid | null",
  "body": "string",
  "createdAt": "date-time",
  "updatedAt": "date-time"
}
```
