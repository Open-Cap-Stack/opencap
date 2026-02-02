# Bank Accounts APIs

**Endpoint Count:** 6

## Overview

This category contains 6 endpoints for bank accounts operations.


## Bank Accounts


### `GET /v1/bank-accounts/bank-accounts/`

**Summary:** Get Bank Accounts

Get all active bank accounts for the authenticated user

Returns a list of all linked bank accounts with their verification status.
Sensitive account details are not included in this response.

**Success Response (200):** Successful Response

---

### `POST /v1/bank-accounts/bank-accounts/link`

**Summary:** Link Bank Account

Link a new bank account for the authenticated user

This endpoint allows users to securely link their bank account for ACH payments.
Account credentials are encrypted before storage.

Security features:
- All sensitive data is encrypted using Fernet (AES-128)
- Only last 4 digits stored in plain text
- Requires authentication token
- Input validation for account details

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/bank-accounts/bank-accounts/{account_id}`

**Summary:** Get Bank Account Details

Get details for a specific bank account

Returns bank account details without sensitive information.
Only the account owner can access this endpoint.

**Parameters:**

- `account_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/bank-accounts/bank-accounts/{account_id}`

**Summary:** Remove Bank Account

Remove a bank account

Soft deletes the bank account. The account will no longer be available
for transactions but historical data is preserved for audit purposes.

**Parameters:**

- `account_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/bank-accounts/bank-accounts/{account_id}/set-default`

**Summary:** Set Default Bank Account

Set a bank account as the default payment method

Only one account can be set as default at a time.
This will automatically unset the previous default account.

**Parameters:**

- `account_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/bank-accounts/bank-accounts/{account_id}/verify`

**Summary:** Verify Bank Account

Verify a bank account

Verifies the bank account using micro-deposits or instant verification.
Account must be verified before it can be used for transactions.

**Parameters:**

- `account_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
