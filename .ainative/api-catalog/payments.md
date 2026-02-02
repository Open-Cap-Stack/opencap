# Payments APIs

**Endpoint Count:** 11

## Overview

This category contains 11 endpoints for payments operations.


## Payments


### `GET /v1/payments/bank-accounts`

**Summary:** List Bank Accounts

List all bank accounts for the current user

Returns:
    BankAccountListResponse: List of linked bank accounts

**Success Response (200):** Successful Response

---

### `POST /v1/payments/bank-accounts`

**Summary:** Link Bank Account

Link a bank account to the user's wallet

Securely stores encrypted bank account information for ACH transactions.

Args:
    request: Bank account details (account number, routing number, etc.)

Returns:
    BankAccountResponse: Created bank account details (with masked account numbers)

Raises:
    HTTPException 400: If wallet not found or invalid account details
    HTTPException 500: If account linking fails

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `DELETE /v1/payments/bank-accounts/{account_id}`

**Summary:** Remove Bank Account

Remove a bank account

Performs soft delete of the bank account.

Args:
    account_id: UUID of the bank account to remove

Returns:
    Success confirmation

Raises:
    HTTPException 404: If account not found or unauthorized
    HTTPException 500: If removal fails

**Parameters:**

- `account_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/payments/deposit`

**Summary:** Deposit Money

Deposit money from bank account to wallet

Initiates an ACH deposit transaction from the specified bank account.

Args:
    request: Deposit details (bank account ID, amount, description)

Returns:
    TransactionResponse: Created transaction details

Raises:
    HTTPException 400: If wallet or bank account not found
    HTTPException 500: If deposit fails

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/payments/transactions`

**Summary:** Get Transaction History

Get transaction history for the current user

Returns paginated list of transactions with optional filters.

Args:
    transaction_type: Filter by transaction type
    status: Filter by transaction status
    page: Page number
    page_size: Items per page

Returns:
    TransactionListResponse: Paginated transaction list

**Parameters:**

- `transaction_type` (query): Filter by transaction type: ISSUE, REDEEM, TRANSFER
- `status` (query): Filter by status: PENDING, SUCCESS, FAILED, QUEUED, REVIEW
- `page` (query): Page number
- `page_size` (query): Items per page

**Success Response (200):** Successful Response

---

### `GET /v1/payments/transactions/export`

**Summary:** Export Transactions

Export transaction history to CSV

Exports all transactions matching the provided filters to CSV format.

Returns:
    CSV file with transaction history

**Parameters:**

- `transaction_type` (query): Filter by transaction type (ISSUE, REDEEM, TRANSFER)
- `status` (query): Filter by status (PENDING, SUCCESS, FAILED, QUEUED, REVIEW)
- `start_date` (query): Filter by start date (ISO 8601 format)
- `end_date` (query): Filter by end date (ISO 8601 format)

**Success Response (200):** Successful Response

---

### `POST /v1/payments/transfer`

**Summary:** Transfer Money

Transfer money to another user

Initiates a peer-to-peer transfer to another user's wallet.

Args:
    request: Transfer details (recipient user ID, amount, description)

Returns:
    TransactionResponse: Created transaction details

Raises:
    HTTPException 400: If insufficient balance or recipient not found
    HTTPException 500: If transfer fails

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/payments/wallets`

**Summary:** Create Wallet

Create a Sila wallet for the current user

Creates a new Sila wallet with KYC pending status.
Each user can only have one wallet.

Returns:
    WalletResponse: Created wallet details

Raises:
    HTTPException 400: If wallet already exists
    HTTPException 500: If wallet creation fails

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/payments/wallets/me`

**Summary:** Get My Wallet

Get wallet details for the current user

Returns:
    WalletResponse: Current user's wallet details

Raises:
    HTTPException 404: If wallet not found

**Success Response (200):** Successful Response

---

### `GET /v1/payments/wallets/me/balance`

**Summary:** Get Wallet Balance

Get current wallet balance

Returns:
    WalletBalanceResponse: Current wallet balance in USD

Raises:
    HTTPException 404: If wallet not found

**Success Response (200):** Successful Response

---

### `POST /v1/payments/withdraw`

**Summary:** Withdraw Money

Withdraw money from wallet to bank account

Initiates an ACH withdrawal transaction to the specified bank account.

Args:
    request: Withdrawal details (bank account ID, amount, description)

Returns:
    TransactionResponse: Created transaction details

Raises:
    HTTPException 400: If insufficient balance or invalid account
    HTTPException 500: If withdrawal fails

**Request Body:** JSON

**Success Response (201):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
