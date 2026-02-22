Billing

Charges

Payments

Failed

This is scalable if later you add:

retries

disputes

refunds

taxes

My recommendation for your case

Use:

Billing

Inside it:

Charges

Payments

Agreements

Reason:

Strategists think financial operations, not individual agreements.

Mental model

Client thinks:

"How do I pay this agreement?"

Strategist thinks:

"What money is coming in, pending, or failing?"

That difference is why Billing tends to be the cleanest strategist view name.

---

# Implementation - Phase 1 ✅ Complete

## Features Implemented

### Navigation
- ✅ Added "Billing" menu item to strategist sidebar
- ✅ Route: `/strategist/billing`
- ✅ Icon: CreditCard
- ✅ STRATEGIST role access only

### API Layer
- ✅ `getAllCharges()` function - calls `GET /charges`
- ✅ Automatic `amountCents` → `amount` (dollars) conversion
- ✅ Error handling with empty array fallback

### State Management
- ✅ Created `BillingStore.ts` with Zustand
- ✅ Filters: all, pending, paid, failed, cancelled
- ✅ Search by Agreement ID, Description, or Charge ID
- ✅ Computed totals: getTotalPending(), getTotalPaid(), getTotalFailed()
- ✅ React hook: `useBilling()` with selector pattern

### UI Components
- ✅ **Summary Cards**: Pending, Paid, Failed totals (color-coded)
- ✅ **Filter Tabs**: All / Pending / Paid / Failed
- ✅ **Search Box**: By Agreement ID, Description, or Charge ID
- ✅ **Charges Table**: 
  - Agreement ID (truncated)
  - Amount (formatted currency)
  - Status (color-coded badge)
  - Date (formatted)
  - Description
- ✅ **Loading State**: Skeleton cards
- ✅ **Empty State**: Icon + message
- ✅ **Error Handling**: Red banner with message

### Features
- ✅ Load all charges on mount
- ✅ Real-time filtering
- ✅ Search functionality
- ✅ Manual refresh button
- ✅ Currency & date formatting
- ✅ Responsive design
- ✅ Role-based access control

---

## API Endpoints

### Charges

```
GET /charges
→ Retrieve all ChargeModels for the strategist

GET /charges/{id}
→ Retrieve a single ChargeModel

POST /charges
→ Create a single ChargeModel

PATCH /charges/{id}
→ Update a single ChargeModel

POST /charges/{id}/cancel
→ Cancel a charge

POST /charges/{id}/payment-link
→ Generate payment link for a charge

GET /charges/agreement/{agreementId}
→ Get all charges for an agreement
```

---

## Future Enhancements (Phase 2)

- Date range picker
- Payments tab
- Disputes tracking
- Refunds handling
- Tax calculations
- Retry history
- CSV/PDF export
- Webhook updates
- Payment link generation
- Bulk actions
- Revenue charts