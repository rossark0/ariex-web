# Compliance Role

Compliance team members oversee strategists and clients, ensuring regulatory compliance and quality control.

## Documentation

| Document | Description |
|----------|-------------|
| [Overview](./overview.md) | Compliance role responsibilities |

## Key Responsibilities

1. **Monitor strategist activity**
2. **Review client documents** for compliance
3. **Audit tax strategies** before finalization
4. **Manage strategist accounts**
5. **Handle escalations** and edge cases
6. **Generate compliance reports**

## Routes

| Route | Description |
|-------|-------------|
| `/compliance/dashboard` | Main compliance dashboard |
| `/compliance/clients` | All clients across strategists |
| `/compliance/clients/[id]` | Client detail view |
| `/compliance/clients/[id]/documents` | Client documents |
| `/compliance/clients/[id]/comments` | Internal comments |
| `/compliance/strategists` | All strategists |
| `/compliance/strategists/[id]` | Strategist detail |
| `/compliance/settings` | Compliance settings |

## Permissions

Compliance has read access to:
- All client data
- All strategist data
- All documents
- All payments
- All conversations

Compliance can:
- Add internal comments
- Flag issues
- Approve/reject strategies
- Reassign clients






