# Strategist Actions

This document lists all actions a strategist can perform in the Ariex platform.

## Client Management

| Action | Description | Route |
|--------|-------------|-------|
| **Create Client** | Add a new client to the system | Dashboard → Add Client |
| **View Client** | See client details and status | `/strategist/clients/[id]` |
| **Manage Onboarding** | Track and update onboarding progress | `/strategist/clients/[id]/onboarding` |
| **Add to Folder** | Organize clients into folders | Client Detail → Add to Folder |

## Document Management

| Action | Description | Route |
|--------|-------------|-------|
| **View Documents** | See all client-uploaded documents | `/strategist/clients/[id]/documents` |
| **Download Document** | Download document to local machine | Documents → Download |
| **Send for Signature** | Send document  | `/strategist/clients/[id]/signature` |
| **Upload Document** | Upload document on behalf of client | Documents → Upload |

## Payment Management

| Action | Description | Route |
|--------|-------------|-------|
| **Create Payment Link** | Generate Stripe/Coinbase payment link | `/strategist/clients/[id]/billing` |
| **View Payments** | See payment history and pending invoices | `/strategist/clients/[id]/billing` |
| **Send Invoice** | Email invoice to client | Billing → Send Invoice |

## Strategy & AI

| Action | Description | Route |
|--------|-------------|-------|
| **Chat with AI** | Use AI assistant for tax planning | Floating chatbot |
| **Generate Strategy** | AI-powered tax strategy generation | `/strategist/clients/[id]/strategy` |
| **Export PDF** | Export strategy as PDF | Strategy → Export PDF |
| **Send Strategy** | Send strategy for client signature | Strategy → Send for Signature |

## Communication

| Action | Description | Route |
|--------|-------------|-------|
| **Message Client** | Send message to client | Client Detail → Message |
| **Assign To-Do** | Add task to client's to-do list | `/strategist/clients/[id]/tasks` |
| **View Conversations** | See chat history with client | Client messages |

## Action Categories

```typescript
const strategistActions = {
  clientManagement: [
    { id: 'create_client', label: 'Create New Client', icon: 'UserPlus' },
    { id: 'view_clients', label: 'View All Clients', icon: 'Users' },
    { id: 'client_onboarding', label: 'Manage Onboarding', icon: 'ClipboardList' },
  ],
  documentManagement: [
    { id: 'view_documents', label: 'View Client Documents', icon: 'FileText' },
    { id: 'download_documents', label: 'Download Documents', icon: 'Download' },
    { id: 'send_for_signature', label: 'Send for Signature', icon: 'PenLine' },
  ],
  paymentManagement: [
    { id: 'create_payment_link', label: 'Create Payment Link', icon: 'CreditCard' },
    { id: 'view_payments', label: 'View Payments', icon: 'DollarSign' },
    { id: 'send_invoice', label: 'Send Invoice', icon: 'Send' },
  ],
  communication: [
    { id: 'chat_with_ai', label: 'AI Strategy Assistant', icon: 'Bot' },
    { id: 'message_client', label: 'Message Client', icon: 'MessageSquare' },
    { id: 'assign_todo', label: 'Assign To-Do', icon: 'CheckSquare' },
  ],
  strategy: [
    { id: 'generate_strategy', label: 'Generate Tax Strategy', icon: 'Sparkles' },
    { id: 'export_pdf', label: 'Export Strategy PDF', icon: 'FileOutput' },
  ],
};
```






