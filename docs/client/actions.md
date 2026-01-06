# Client Actions

This document lists all actions a client can perform in the Ariex platform.

## During Onboarding

| Action | Description | Route/Method |
|--------|-------------|--------------|
| **Sign Agreement** | Digitally sign service agreement | Email link → DocuSign |
| **Pay Fee** | Pay onboarding fee | Email link → Stripe/Coinbase |
| **Upload Documents** | Upload initial tax documents | `/client/uploads` |

## After Onboarding

### Document Management

| Action | Description | Route |
|--------|-------------|-------|
| **Upload Documents** | Upload additional tax documents | `/client/uploads` |
| **View Documents** | See all uploaded documents | `/client/uploads` |
| **Download Documents** | Download your documents | `/client/uploads` |

### Payments

| Action | Description | Route |
|--------|-------------|-------|
| **View Invoices** | See all invoices and payment history | `/client/billing` |
| **Pay Invoice** | Pay outstanding invoice | Payment link |
| **View Receipts** | See payment receipts | `/client/billing` |

### Agreements & Signatures

| Action | Description | Route |
|--------|-------------|-------|
| **View Agreements** | See all agreements | `/client/agreements` |
| **Sign Document** | Sign document sent by strategist | Email link |
| **Download Signed** | Download signed documents | `/client/agreements` |

### Communication

| Action | Description | Route |
|--------|-------------|-------|
| **Chat with Strategist** | Message your tax strategist | Dashboard chat |
| **Chat with AI** | Ask AI general tax questions | Floating chatbot |

### Tasks

| Action | Description | Route |
|--------|-------------|-------|
| **View To-Do List** | See tasks assigned by strategist | `/client/tasks` |
| **Complete Task** | Mark task as done | `/client/tasks` |

## Document Types Client Can Upload

| Type | Category | Examples |
|------|----------|----------|
| W-2 | `w2` | Employment income forms |
| 1099 | `1099` | 1099-NEC, 1099-INT, 1099-DIV, etc. |
| Tax Returns | `1040` | Previous year returns |
| Receipts | `receipt` | Business expense receipts |
| Bank Statements | `bank_statement` | Monthly statements |
| Investment Statements | `investment_statement` | Brokerage statements |
| Contracts | `contract` | Business contracts |
| Other | `other` | Any other relevant documents |

## Action Flow

```
CLIENT ACTIONS BY PHASE

┌─────────────────────────────────────┐
│ PHASE 1: ONBOARDING                 │
│                                     │
│ • Sign Agreement                    │
│ • Pay Fee                           │
│ • Upload Initial Documents          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ PHASE 2: STRATEGY DEVELOPMENT       │
│                                     │
│ • Wait for strategist               │
│ • Answer questions (chat)           │
│ • Upload additional docs if needed  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ PHASE 3: STRATEGY REVIEW            │
│                                     │
│ • Receive strategy document         │
│ • Review recommendations            │
│ • Sign to approve plan              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ PHASE 4: ONGOING                    │
│                                     │
│ • Complete assigned tasks           │
│ • Pay invoices                      │
│ • Upload new documents              │
│ • Chat with strategist/AI           │
└─────────────────────────────────────┘
```






