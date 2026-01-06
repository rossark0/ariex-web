# Strategist Role

Tax Strategists are the primary users of the Ariex platform. They manage client relationships, create tax strategies, and guide clients through the tax optimization process.

## Documentation

| Document | Description |
|----------|-------------|
| [Client Status Flow](./client-status-flow.md) | How client statuses work and transition |
| [Actions](./actions.md) | All actions a strategist can perform |
| [Dashboard](./dashboard.md) | Dashboard features and data |

## Key Responsibilities

1. **Create and manage client accounts**
2. **Send documents for signature** (agreements, strategies)
3. **Set payment links** for clients
4. **Review client documents** (W-2s, 1099s, etc.)
5. **Generate tax strategies** using AI
6. **Communicate with clients** via chat
7. **Assign to-do lists** to clients

## Routes

| Route | Description |
|-------|-------------|
| `/strategist/dashboard` | Main dashboard with clients list |
| `/strategist/clients` | All clients list |
| `/strategist/clients/[id]` | Client detail page |
| `/strategist/clients/[id]/strategy` | AI-powered strategy creation |
| `/strategist/clients/[id]/documents` | Client documents |
| `/strategist/clients/[id]/billing` | Payment links and invoices |
| `/strategist/clients/[id]/signature` | Documents for signature |
| `/strategist/clients/[id]/tasks` | Client to-do list |
| `/strategist/tasks` | All tasks overview |
| `/strategist/reports` | Reports and analytics |
| `/strategist/support` | Help and support |






