# 💰 Invoices APIs

**Endpoint Count:** 9

## Overview

This category contains 9 endpoints for 💰 invoices operations.


## 💰 Invoices


### `POST /v1/invoices`

**Summary:** Create Invoice

Create a new invoice (draft status)

Creates invoice in local database with:
- Unique invoice number (INV-YYYY-NNNN format)
- Line items with descriptions, quantities, prices
- Calculated totals
- Initial status: 'draft'

Permissions:
- Admins can create invoices for any user
- Regular users can only create invoices for themselves

Cost Savings:
- No Stripe invoicing fee (0.4% saved)
- Only pay Stripe payment processing when customer pays (2.9% + $0.30)

Args:
    invoice_data: Invoice creation data
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Created invoice with ID, number, totals, status

Raises:
    HTTPException 400: Invalid line items or data
    HTTPException 403: Forbidden (trying to create for another user)
    HTTPException 500: Database error

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/invoices`

**Summary:** List Invoices

List invoices with pagination and filtering

Permissions:
- Regular users: See only their own invoices
- Admins: Can filter by any user_id or see all invoices

Filters:
- status: Filter by status (draft, sent, paid, overdue, void)
- user_id: Filter by user (admin only)
- skip/limit: Pagination

Args:
    status_filter: Invoice status filter
    user_id: User ID filter (admin only)
    skip: Records to skip for pagination
    limit: Maximum records to return
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceListResponse: List of invoices with pagination metadata

Raises:
    HTTPException 403: Forbidden (non-admin trying to access others' invoices)
    HTTPException 500: Database error

**Parameters:**

- `status` (query): Filter by invoice status
- `user_id` (query): Filter by user ID (admin only)
- `skip` (query): Number of records to skip
- `limit` (query): Maximum number of records

**Success Response (200):** Successful Response

---

### `GET /v1/invoices/{invoice_id}`

**Summary:** Get Invoice

Get invoice details by ID

Permissions:
- Users can only view their own invoices
- Admins can view any invoice

Args:
    invoice_id: Invoice ID (UUID)
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Complete invoice details

Raises:
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: Database error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PATCH /v1/invoices/{invoice_id}`

**Summary:** Update Invoice

Update a draft invoice

Only draft invoices can be updated. Once finalized, invoices are immutable.

Updatable fields:
- line_items: Update items, quantities, prices
- due_date: Change payment due date
- period_start/period_end: Update billing period
- metadata: Add/update custom fields

Permissions:
- Users can only update their own invoices
- Admins can update any invoice

Args:
    invoice_id: Invoice ID
    updates: Fields to update
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Updated invoice

Raises:
    HTTPException 400: Invalid updates or invoice not in draft status
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: Database error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/invoices/{invoice_id}/finalize`

**Summary:** Finalize Invoice

Finalize invoice (change status from draft to sent)

Finalizing an invoice:
1. Changes status from 'draft' to 'sent'
2. Generates PDF invoice
3. Sends email notification to customer
4. Makes invoice immutable (no further edits allowed)

Permissions:
- Users can only finalize their own invoices
- Admins can finalize any invoice

Args:
    invoice_id: Invoice ID
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Finalized invoice

Raises:
    HTTPException 400: Invoice not in draft status or invalid
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: Database or processing error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/invoices/{invoice_id}/mark-paid`

**Summary:** Mark Invoice Paid

Manually mark invoice as paid

Use this endpoint for non-Stripe payments:
- Wire transfers
- ACH payments
- Cash payments
- Checks
- Other payment methods

For Stripe payments, use the payment intent webhook (automatic).

Updates:
- status = 'paid'
- paid_at = provided timestamp or now
- amount_paid = amount_total
- metadata updated with payment details

Permissions:
- Only admins can manually mark invoices as paid
- Regular users cannot mark their own invoices as paid (fraud prevention)

Args:
    invoice_id: Invoice ID
    payment_data: Payment method, reference, notes
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Updated invoice marked as paid

Raises:
    HTTPException 400: Invoice already paid or void
    HTTPException 403: Forbidden (non-admin user)
    HTTPException 404: Invoice not found
    HTTPException 500: Database error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/invoices/{invoice_id}/payment-intent`

**Summary:** Create Invoice Payment Intent

Create Stripe Payment Intent for invoice payment

This endpoint creates a Payment Intent for collecting payment on an invoice.
Returns the client_secret needed for Stripe.js frontend payment form.

Cost Savings:
- Uses Stripe Payment Intent (2.9% + $0.30 fee)
- NO Stripe Invoicing (saves 0.4% fee)
- Example: $10,000 invoice = $40 saved per transaction

Flow:
1. Customer views invoice
2. Clicks "Pay Now"
3. Frontend calls this endpoint to get client_secret
4. Frontend uses Stripe.js to collect payment
5. Stripe processes payment
6. Webhook marks invoice as paid

Permissions:
- Users can only create payment intents for their own invoices
- Admins can create payment intents for any invoice

Args:
    invoice_id: Invoice ID
    current_user: Authenticated user
    db: Database session

Returns:
    PaymentIntentResponse: Contains client_secret for Stripe.js

Raises:
    HTTPException 400: Invoice already paid or invalid
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: Payment Intent creation failed

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/invoices/{invoice_id}/pdf`

**Summary:** Get Invoice Pdf

Get invoice PDF URL or generate if not exists

Returns the PDF URL if already generated, otherwise generates it on-demand.

Permissions:
- Users can only access their own invoice PDFs
- Admins can access any invoice PDF

Args:
    invoice_id: Invoice ID
    current_user: Authenticated user
    db: Database session

Returns:
    dict: PDF URL and metadata

Raises:
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: PDF generation error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/invoices/{invoice_id}/void`

**Summary:** Void Invoice

Void/cancel an invoice

Voiding an invoice:
- Changes status to 'void'
- Invoice cannot be paid
- Invoice cannot be un-voided

Use cases:
- Customer cancelled order
- Invoice sent in error
- Duplicate invoice created

Permissions:
- Users can only void their own invoices
- Admins can void any invoice

Args:
    invoice_id: Invoice ID
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Voided invoice

Raises:
    HTTPException 400: Invoice already paid or void
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: Database error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
