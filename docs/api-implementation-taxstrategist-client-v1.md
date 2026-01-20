# API Implementation: Tax Strategist ↔ Client Flow v1

This document outlines the complete flow between a Tax Strategist and a Client on the Ariex platform, including all API endpoints and integration points.

---

## Table of Contents

1. [Phase 1: Client Acquisition](#phase-1-client-acquisition) ✅ **COMPLETE**
2. [Phase 2: Onboarding](#phase-2-onboarding) 🔶 **IN PROGRESS**
3. [Phase 3: Strategy Development](#phase-3-strategy-development)
4. [Phase 4: Ongoing Relationship](#phase-4-ongoing-relationship)
5. [Client Status Progression](#client-status-progression)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [External Integrations](#external-integrations)

---

## Phase 1: Client Acquisition ✅ COMPLETE

**Status:** Fully implemented and tested

### Implementation Summary

| Component | File | Status |
|-----------|------|--------|
| Invite Client API | `src/lib/api/strategist.api.ts` | ✅ |
| Client List Page | `src/app/(app)/strategist/clients/page.tsx` | ✅ |
| Complete Password Page | `src/app/(marketing)/complete-password/page.tsx` | ✅ |
| Complete Password Form | `src/contexts/auth/components/complete-password-form.tsx` | ✅ |
| Client Dashboard | `src/app/(app)/client/home/page.tsx` | ✅ |
| Client API Service | `src/lib/api/client.api.ts` | ✅ |

### Flow Diagram

```
STRATEGIST                                         CLIENT
    │                                                 
    │ 1. Creates client account                       
    │    POST /users/clients/invite                   
    │    (email, name, phone, etc.)                   
    │                                                 │
    │ ─────────────────────────────────────────────► │
    │         📧 Email: "You've been invited"         │
    │         (temporary password)                    │
    │                                                 │
    │                                                 │ 2. Client logs in
    │                                                 │    /complete-password
    │                                                 │    (sets new password)
    │                                                 │
    │                                                 │ 3. Client lands on dashboard
    │                                                 │    /client/home
    │                                                 │    (real API data)
    │                                                 │
    │                                            ✅ ACCOUNT CREATED
```

### API Calls

| Step | Actor | Endpoint | Method | Payload |
|------|-------|----------|--------|---------|
| 1 | Strategist | `/users/clients/invite` | POST | `{ email, fullName, phone?, address?, businessName?, clientType }` |
| 1b | Strategist | `/users/{userId}/client-profile` | POST | `{ phoneNumber, address, businessName, businessType, onboardingComplete: false }` |
| 2 | Client | `/auth/complete-password` | POST | `{ email, tempPassword, newPassword }` |
| 3 | Client | `/users/{userId}` | GET | - |
| 3b | Client | `/users/{userId}/client-profile` | GET | - |
| 3c | Client | `/agreements` | GET | - |
| 3d | Client | `/documents` | GET | - |
| 3e | Client | `/todos` | GET | - |

### Frontend Routes

| Actor | Route | Description |
|-------|-------|-------------|
| Strategist | `/strategist/clients` | Client list with "Add Client" modal |
| Client | `/complete-password` | Set new password on first login |
| Client | `/client/home` | Dashboard with onboarding timeline |

---

## Phase 2: Onboarding 🔶 IN PROGRESS

The onboarding phase consists of 3 mandatory steps that must be completed in order.

### Step 2A: Service Agreement

```
STRATEGIST                                         CLIENT
    │                                                 │
    │ 3. Sends Service Agreement                      │
    │    → SignatureAPI creates envelope              │
    │    → POST /agreements (store in DB)             │
    │    → POST /agreements/{id}/contract             │
    │                                                 │
    │ ─────────────────────────────────────────────► │
    │         📧 Email: "Sign your agreement"         │
    │                                                 │
    │                                                 │ 4. Client signs agreement
    │                                                 │    (SignatureAPI ceremony)
    │                                                 │
    │ ◄───────────────────────────────────────────── │
    │         🔔 Webhook: "Agreement signed"          │
    │                                                 │
    │                                            ✅ AGREEMENT SIGNED
```

#### API Calls

| Step | Actor | Endpoint | Method | Payload |
|------|-------|----------|--------|---------|
| 3a | Strategist | SignatureAPI `/v1/envelopes` | POST | `{ title, sender, documents, recipients }` |
| 3b | Strategist | `/agreements` | POST | `{ clientId, type: 'service_agreement', status: 'pending' }` |
| 3c | Strategist | `/agreements/{id}/contract` | POST | `{ envelopeId, documentUrl }` |
| 4 | Webhook | `/api/webhooks/signatureapi` | POST | `{ event: 'envelope.completed', envelopeId }` |

---

### Step 2B: Payment

```
STRATEGIST                                         CLIENT
    │                                                 │
    │ 5. Sends Payment Link                           │
    │    POST /agreements/{id}/payment                │
    │    (Stripe/Coinbase URL)                        │
    │                                                 │
    │ ─────────────────────────────────────────────►  │
    │         📧 Email: "Complete your payment"       │
    │                                                 │
    │                                                 │ 6. Client pays ($499/$799)
    │                                                 │    (Stripe checkout)
    │                                                 │
    │ ◄───────────────────────────────────────────── │
    │         🔔 Webhook: "Payment complete"          │
    │                                                 │
    │                                            ✅ PAYMENT RECEIVED
```

#### API Calls

| Step | Actor | Endpoint | Method | Payload |
|------|-------|----------|--------|---------|
| 5 | Strategist | `/agreements/{id}/payment` | POST | `{ paymentUrl, amount, provider: 'stripe' \| 'coinbase' }` |
| 6 | Webhook | `/api/webhooks/stripe` | POST | `{ event: 'checkout.session.completed', ... }` |

---

### Step 2C: Document Upload

```
STRATEGIST                                         CLIENT
    │                                                 │
    │ 7. Requests Documents                           │
    │    (Creates todo: "Upload tax documents")       │
    │    POST /todos                                  │
    │                                                 │
    │ ─────────────────────────────────────────────► │
    │         📧/Dashboard: "Upload your docs"        │
    │                                                 │
    │                                                 │ 8. Client uploads docs
    │                                                 │    POST /s3/upload-url
    │                                                 │    POST /s3/confirm/{fileId}
    │                                                 │    POST /documents
    │                                                 │    (W-2s, 1099s, etc.)
    │                                                 │
    │ ◄───────────────────────────────────────────── │
    │         Dashboard shows uploaded files          │
    │                                                 │
    │                                            ✅ DOCUMENTS UPLOADED
    │                                                 │
    │                                       ═══════════════════════
    │                                       ✅ ONBOARDING COMPLETE
    │                                       ═══════════════════════
```

#### API Calls

| Step | Actor | Endpoint | Method | Payload |
|------|-------|----------|--------|---------|
| 7a | Strategist | `/todo-lists` | POST | `{ title: 'Onboarding Tasks', clientId }` |
| 7b | Strategist | `/todos` | POST | `{ title: 'Upload tax documents', listId, description }` |
| 8a | Client | `/s3/upload-url` | POST | `{ fileName, contentType }` |
| 8b | Client | `/s3/confirm/{fileId}` | POST | `{}` |
| 8c | Client | `/documents` | POST | `{ name, type, fileId }` |

#### Document Types

| Type | Category | Examples |
|------|----------|----------|
| W-2 | `w2` | Employment income forms |
| 1099 | `1099` | 1099-NEC, 1099-INT, 1099-DIV |
| Tax Returns | `1040` | Previous year returns |
| Receipts | `receipt` | Business expense receipts |
| Bank Statements | `bank_statement` | Monthly statements |
| Investment Statements | `investment_statement` | Brokerage statements |

---

## Phase 3: Strategy Development

```
STRATEGIST                                         CLIENT
    │                                                 │
    │ 9. Reviews documents                            │
    │    GET /documents                               │
    │    GET /s3/download-url                         │
    │                                                 │
    │ 10. Generates Tax Strategy                      │
    │     (AI-assisted or manual)                     │
    │     POST /content (save strategy)               │
    │                                                 │
    │ 11. Sends Strategy for Signature                │
    │     → SignatureAPI (strategy PDF)               │
    │     → Links to agreement                        │
    │                                                 │
    │ ─────────────────────────────────────────────► │
    │         📧 Email: "Review your tax strategy"    │
    │                                                 │
    │                                                 │ 12. Client reviews & signs
    │                                                 │     (SignatureAPI ceremony)
    │                                                 │
    │ ◄───────────────────────────────────────────── │
    │         🔔 Webhook: "Strategy signed"           │
    │                                                 │
    │                                       ═══════════════════════
    │                                       ✅ PLAN ACTIVE
    │                                       ═══════════════════════
```

### API Calls

| Step | Actor | Endpoint | Method | Payload |
|------|-------|----------|--------|---------|
| 9a | Strategist | `/documents` | GET | Query: `?clientId={id}` |
| 9b | Strategist | `/s3/download-url` | POST | `{ fileId }` |
| 10 | Strategist | `/content` | POST | `{ title, body, type: 'strategy', clientId }` |
| 11a | Strategist | SignatureAPI `/v1/envelopes` | POST | `{ title: 'Tax Strategy', documents, recipients }` |
| 11b | Strategist | `/documents` | POST | `{ name, type: 'strategy', signatureStatus: 'sent', envelopeId }` |
| 12 | Webhook | `/api/webhooks/signatureapi` | POST | `{ event: 'envelope.completed', envelopeId }` |

### Frontend Routes

| Actor | Route | Description |
|-------|-------|-------------|
| Strategist | `/strategist/clients/[id]/documents` | View client documents |
| Strategist | `/strategist/clients/[id]/strategy` | AI strategy generation |
| Client | `/client/agreements` | View and sign strategy |

---

## Phase 4: Ongoing Relationship

```
STRATEGIST                                         CLIENT
    │                                                 │
    │ Assigns tasks                                   │
    │ POST /todos                              ────► │ Completes tasks
    │                                                 │ PUT /todos/{id}
    │                                                 │
    │ Sends invoices                                  │
    │ (payment links)                          ────► │ Pays invoices
    │                                                 │
    │ Requests more docs                              │
    │                                          ────► │ Uploads docs
    │                                                 │
    │ ◄──────────────────────────────────────────── │
    │         💬 Chat (questions, updates)            │
    │ ────────────────────────────────────────────► │
    │                                                 │
    │ Creates new strategy                            │
    │ (annual/quarterly updates)               ────► │ Signs updated strategy
    │                                                 │
```

### API Calls

| Action | Actor | Endpoint | Method |
|--------|-------|----------|--------|
| Assign task | Strategist | `/todos` | POST |
| Complete task | Client | `/todos/{id}` | PUT |
| Send invoice | Strategist | `/agreements/{id}/payment` | POST |
| Upload document | Client | `/s3/upload-url` → `/documents` | POST |
| Chat | Both | Chat system (WebSocket/Firebase) | - |
| Complete agreement | Strategist | `/agreements/{id}/complete` | POST |
| Archive agreement | Strategist | `/agreements/{id}/archive` | POST |

---

## Client Status Progression

| Status | Condition | Timeline Display |
|--------|-----------|------------------|
| **Invited** | Account created, hasn't logged in | "Account created" |
| **Onboarding** | Logged in, steps incomplete | Shows pending steps |
| **No Plan** | Onboarding done, no strategy | "Tax strategy pending" |
| **Plan Pending** | Strategy sent, awaiting signature | "Strategy sent for approval" |
| **Plan Active** | Strategy signed | "Tax strategy approved & signed" |
| **Suspended** | Account suspended | N/A |

### Status Badge Colors

| Status | Background | Text |
|--------|------------|------|
| Invited | `bg-blue-100` | `text-blue-700` |
| Onboarding | `bg-amber-100` | `text-amber-700` |
| No Plan | `bg-zinc-100` | `text-zinc-600` |
| Plan Pending | `bg-teal-100` | `text-teal-700` |
| Plan Active | `bg-emerald-100` | `text-emerald-700` |
| Suspended | `bg-red-100` | `text-red-700` |

---

## API Endpoints Reference

### Ariex Backend API

Base URL: `https://qt4pgrsacn.us-east-2.awsapprunner.com`

#### Users & Profiles

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/clients/invite` | POST | Invite new client |
| `/users/my-clients` | GET | List strategist's clients |
| `/users/{id}` | GET | Get user by ID |
| `/users/{userId}/status` | PATCH | Update user status |
| `/users/{userId}/client-profile` | GET/POST | Get/Create client profile |
| `/users/{userId}/strategist-profile` | GET/POST | Get/Create strategist profile |

#### Agreements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/agreements` | POST | Create agreement |
| `/agreements` | GET | List agreements |
| `/agreements/{id}` | GET | Get agreement by ID |
| `/agreements/{id}/contract` | POST | Attach contract document |
| `/agreements/{id}/payment` | POST | Attach payment reference |
| `/agreements/{id}/complete` | POST | Mark as completed |
| `/agreements/{id}/cancel` | POST | Cancel agreement |
| `/agreements/{id}/archive` | POST | Archive agreement |
| `/agreements/{id}/status` | GET | Get agreement status |

#### Documents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/documents` | POST | Create document |
| `/documents` | GET | List documents |
| `/documents/{id}` | GET | Get document by ID |
| `/documents/{id}` | PUT | Update document |
| `/documents/{id}` | DELETE | Delete document |
| `/documents/{id}/sign` | POST | Mark as signed |

#### S3 File Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/s3/upload-url` | POST | Get presigned upload URL |
| `/s3/confirm/{fileId}` | POST | Confirm upload complete |
| `/s3/download-url` | POST | Get presigned download URL |
| `/s3/files/{fileId}` | GET | Get file metadata |
| `/s3/files/{fileId}` | DELETE | Delete file |
| `/s3/my-files` | GET | List user's files |

#### Todos

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/todos` | POST | Create todo |
| `/todos` | GET | List todos |
| `/todos/{id}` | GET | Get todo |
| `/todos/{id}` | PUT | Update todo |
| `/todos/{id}` | DELETE | Delete todo |
| `/todo-lists` | POST | Create todo list |
| `/todo-lists` | GET | List todo lists |
| `/todo-lists/{id}` | GET/PUT/DELETE | CRUD todo list |

#### Content (Strategies)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/content` | POST | Create content |
| `/content` | GET | List content |
| `/content/{id}` | GET/PATCH/DELETE | CRUD content |

#### Auth

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/complete-password` | POST | Complete password challenge |
| `/auth/signin` | POST | Sign in |
| `/auth/refresh-token` | POST | Refresh token |
| `/auth/logout` | POST | Sign out |

---

## External Integrations

### SignatureAPI

Base URL: `https://api.signatureapi.com/v1`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/envelopes` | POST | Create signature envelope |
| `/envelopes/{id}` | GET | Get envelope status |

#### Envelope Request Structure

```typescript
interface CreateEnvelopeRequest {
  title: string;
  sender: {
    name: string;
    email: string;
  };
  documents: Array<{
    url: string;        // S3 presigned URL or public URL
    format: 'pdf' | 'docx';
    data?: Record<string, string>;  // Template placeholders
  }>;
  recipients: Array<{
    type: 'signer';
    key: string;        // e.g., 'client'
    name: string;
    email: string;
  }>;
}
```

#### Webhook Events

| Event | Description |
|-------|-------------|
| `envelope.sent` | Envelope sent to recipients |
| `envelope.viewed` | Recipient viewed document |
| `envelope.completed` | All signatures collected |
| `envelope.declined` | Recipient declined to sign |

### Stripe (Payments)

| Webhook Event | Description |
|---------------|-------------|
| `checkout.session.completed` | Payment successful |
| `payment_intent.payment_failed` | Payment failed |

### Coinbase Commerce (Crypto Payments)

| Webhook Event | Description |
|---------------|-------------|
| `charge:confirmed` | Crypto payment confirmed |
| `charge:failed` | Payment failed |

---

## Frontend Routes Summary

### Strategist Routes

| Route | Description |
|-------|-------------|
| `/strategist/dashboard` | Main dashboard |
| `/strategist/clients` | All clients list |
| `/strategist/clients/[id]` | Client detail + timeline |
| `/strategist/clients/[id]/documents` | Client documents |
| `/strategist/clients/[id]/billing` | Payment links |
| `/strategist/clients/[id]/tasks` | Client tasks |
| `/strategist/clients/[id]/strategy` | AI strategy creation |
| `/strategist/clients/[id]/signature` | Send for signature |

### Client Routes

| Route | Description |
|-------|-------------|
| `/client/dashboard` | Main dashboard + onboarding |
| `/client/documents` | Upload/view documents |
| `/client/agreements` | View/sign agreements |
| `/client/billing` | Payments & invoices |
| `/client/tasks` | To-do list |

---

## Implementation Checklist

### Phase 1: Core API Integration
- [ ] Create `agreements.api.ts` service
- [ ] Create `signatureapi.ts` service (frontend)
- [ ] Wire `/users/clients/invite` (already done)
- [ ] Wire `/users/{id}/client-profile`

### Phase 2: Agreement Flow
- [ ] "Send Agreement" button → SignatureAPI + `/agreements`
- [ ] Webhook handler for signature completion
- [ ] Agreement status display in timeline

### Phase 3: Payment Flow
- [ ] "Send Payment Link" button → `/agreements/{id}/payment`
- [ ] Stripe checkout link generation
- [ ] Webhook handler for payment completion

### Phase 4: Documents Flow
- [ ] Client document upload with S3 presigned URLs
- [ ] Strategist document viewing
- [ ] Document categorization

### Phase 5: Strategy Flow
- [ ] AI strategy generation
- [ ] Save strategy via `/content`
- [ ] Send strategy for signature
- [ ] Strategy signing webhook

### Phase 6: Tasks/Todos
- [ ] Strategist assigns tasks
- [ ] Client completes tasks
- [ ] Task status sync

---

*Document Version: 1.0*  
*Last Updated: January 20, 2026*
