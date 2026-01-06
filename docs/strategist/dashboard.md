# Strategist Dashboard

The strategist dashboard is the main landing page for tax strategists.

## URL

```
/strategist/dashboard
```

## Features

### 1. Upcoming Tax Deadlines

Displays important tax deadlines and events:

| Date | Event |
|------|-------|
| Jan 15 | Q4 Estimated Tax Payment Due |
| Jan 27 | Tax Season Opens - IRS Accepting Returns |
| Jan 31 | Form 1099 Filing Deadline |
| Jan 31 | W-2 Distribution Deadline |
| Apr 15 | Individual Tax Return Deadline |

### 2. Clients List

Shows all clients assigned to the strategist with:

- **Avatar** (initials)
- **Name & Email**
- **Estimated Income**
- **Status Badge** (Onboarding, No Plan, Plan Pending, Plan Active)
- **Last Updated** time
- **Email Button** for quick contact

### 3. AI Floating Chatbot

Bottom-anchored chat input for AI assistance.

## Data Sources

```typescript
// Current logged-in strategist
const CURRENT_STRATEGIST_ID = 'strategist-001';

// Data fetched
const strategist = getStrategistById(CURRENT_STRATEGIST_ID);
const clients = getFullClientsByStrategist(CURRENT_STRATEGIST_ID);
const clientSummaries = getClientSummariesForStrategist(CURRENT_STRATEGIST_ID);
const recentActivity = getRecentActivity(CURRENT_STRATEGIST_ID, 5);
const pendingSignatures = getPendingSignatureRequests(CURRENT_STRATEGIST_ID);
const pendingPayments = getPendingPaymentLinks(CURRENT_STRATEGIST_ID);
```

## Status Badge Colors

| Status | Background | Text |
|--------|------------|------|
| Onboarding | `bg-amber-100` | `text-amber-700` |
| No Plan | `bg-zinc-100` | `text-zinc-600` |
| Plan Pending | `bg-teal-100` | `text-teal-700` |
| Plan Active | `bg-emerald-100` | `text-emerald-700` |

## Actions

- **Add Client** - Button to create a new client
- **Click Row** - Navigate to client detail page
- **Email Icon** - Quick email action

## Component Structure

```
StrategistDashboardPage
├── Upcoming Tax Deadlines
│   └── EventRow[] (date badge + event details)
├── Your Clients
│   ├── Header (count + Add Client button)
│   └── ClientRow[] (avatar, info, status, actions)
└── AiFloatingChatbot
```






