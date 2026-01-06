# Client Onboarding

This document explains the onboarding process for new Ariex clients.

## Overview

When a strategist creates a new client account, the client must complete 3 onboarding tasks before they can receive a tax strategy.

## Onboarding Tasks

| # | Task | Description | How it's Completed |
|---|------|-------------|-------------------|
| 1 | **Sign Agreement** | Sign the Ariex Service Agreement | Client receives email with DocuSign link |
| 2 | **Pay Fee** | Pay the onboarding fee ($499) | Client clicks payment link (Stripe/Coinbase) |
| 3 | **Upload Documents** | Upload initial tax documents | Client uses upload interface |

## Task Flow

```
┌─────────────────────────────────────────────────────────┐
│                     ONBOARDING                          │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Task 1    │  │   Task 2    │  │   Task 3    │     │
│  │   Sign      │→ │   Pay       │→ │   Upload    │     │
│  │  Agreement  │  │   Fee       │  │   Docs      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  Status: pending → in_progress → completed              │
└─────────────────────────────────────────────────────────┘
                           ↓
              All 3 tasks completed
                           ↓
┌─────────────────────────────────────────────────────────┐
│               ONBOARDING COMPLETE                       │
│                                                         │
│  • Client can now chat with strategist                 │
│  • Client can upload additional documents              │
│  • Strategist can create tax strategy                  │
└─────────────────────────────────────────────────────────┘
```

## Task Details

### Task 1: Sign Agreement

**Purpose**: Legal agreement for services

**Process**:
1. Strategist creates client account
2. System sends agreement 
3. Client receives email notification
4. Client reviews and signs digitally
5. Signed document stored in system

**Document**:
- Ariex Service Agreement 2024
- Category: `contract`
- SignatureStatus: `SENT` → `SIGNED`

### Task 2: Pay Fee

**Purpose**: Collect onboarding fee

**Amount**: $499 (standard) or $799 (premium)

**Payment Methods**:
- Stripe (credit/debit card)
- Coinbase (cryptocurrency)

**Process**:
1. Strategist sends payment link
2. Client clicks link in email
3. Client completes payment
4. Webhook confirms payment
5. Task marked complete

### Task 3: Upload Documents

**Purpose**: Collect initial tax documents for analysis

**Required Documents**:
- W-2 forms
- 1099 forms (1099-NEC, 1099-INT, etc.)
- Previous year tax returns (optional)
- Bank statements (optional)

**Process**:
1. Client logs in to dashboard
2. Navigates to Uploads section
3. Drags and drops files or clicks to select
4. System processes and categorizes documents
5. AI extracts key information
6. Task marked complete when minimum docs uploaded

## Onboarding Status Examples

| Client | Tasks Completed | Status |
|--------|-----------------|--------|
| Robert Wilson | 0/3 | Just created, nothing done |
| Lisa Martinez | 1/3 | Signed agreement, needs to pay |
| Sarah Johnson | 2/3 | Signed & paid, uploading docs |
| Emily Davis | 3/3 | Fully onboarded |

## Data Model

```typescript
interface OnboardingTask {
  id: string;
  clientId: string;
  type: 'sign_agreement' | 'pay_initial' | 'upload_documents';
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Type-specific fields
  agreementDocumentId?: string;  // for sign_agreement
  paymentLinkUrl?: string;       // for pay_initial
  requiredDocumentType?: string; // for upload_documents
}
```

## Client UI

The client sees a progress indicator on their dashboard:

```
Onboarding Progress: 2 of 3 complete
[████████████████░░░░░░░░] 67%

☑ Sign Service Agreement      ✓ Completed
☑ Complete Initial Payment    ✓ Completed
☐ Upload Initial Documents    → In Progress
```






