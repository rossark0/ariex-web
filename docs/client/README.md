# Client Role

Clients are the end users who receive tax strategy services from Ariex. They work with assigned tax strategists to optimize their tax situation.

## Documentation

| Document | Description |
|----------|-------------|
| [Onboarding](./onboarding.md) | The onboarding process for new clients |
| [Dashboard](./dashboard.md) | Client dashboard features |
| [Actions](./actions.md) | All actions a client can perform |

## Key Responsibilities

1. **Complete onboarding** (sign agreement, pay, upload docs)
2. **Upload tax documents** (W-2s, 1099s, bank statements)
3. **Communicate with strategist** via chat
4. **Sign documents** when sent by strategist
5. **Pay invoices** via payment links
6. **Complete to-do tasks** assigned by strategist
7. **Chat with AI** for general tax questions

## Routes

| Route | Description |
|-------|-------------|
| `/client/dashboard` | Main dashboard with tasks and status |
| `/client/uploads` | Document upload and management |
| `/client/agreements` | Agreements to sign |
| `/client/billing` | Payments and invoices |
| `/client/tasks` | To-do list from strategist |

## Client Journey

```
1. Account Created (by Strategist)
         ↓
2. Onboarding
   • Sign agreement
   • Pay onboarding fee
   • Upload initial documents
         ↓
3. Strategy Development
   • Wait for strategist analysis
   • Answer questions if needed
         ↓
4. Review & Sign Strategy
   • Receive strategy document
   • Review recommendations
   • Sign to approve
         ↓
5. Ongoing Relationship
   • Upload new documents
   • Complete assigned tasks
   • Pay invoices
   • Chat with strategist/AI
```






