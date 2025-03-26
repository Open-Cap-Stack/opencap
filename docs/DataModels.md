# OpenCap Data Models

**Version**: 1.0  
**Date**: March 23, 2025  
**Status**: Draft  

This document describes the core data models used throughout the OpenCap platform.

## Models

## User Model
**Feature:** OCDI-102: Create User data model

The User model represents users in the OpenCap system with various roles and permissions.

### Schema Fields

| Field                | Type     | Required | Default   | Description                               |
|----------------------|----------|----------|-----------|-------------------------------------------|
| userId               | String   | Yes      | -         | Unique identifier for the user            |
| firstName            | String   | Yes      | -         | User's first name                         |
| lastName             | String   | Yes      | -         | User's last name                          |
| displayName          | String   | No       | Generated | Full name (firstName + lastName)          |
| email                | String   | Yes      | -         | User's email address (unique)             |
| password             | String   | Yes      | -         | Hashed password                           |
| role                 | String   | Yes      | -         | User role (admin, manager, user, client)  |
| status               | String   | No       | 'pending' | Account status                            |
| companyId            | String   | No       | null      | Associated company ID                     |
| profile              | Object   | No       | {}        | User profile information                  |
| lastLogin            | Date     | No       | null      | Timestamp of last login                   |
| passwordResetToken   | String   | No       | null      | Token for password reset                  |
| passwordResetExpires | Date     | No       | null      | Expiration time for password reset token  |
| createdAt            | Date     | Auto     | Now       | Timestamp when user was created           |
| updatedAt            | Date     | Auto     | Now       | Timestamp when user was last updated      |

### Profile Sub-Schema

| Field       | Type     | Default | Description                     |
|-------------|----------|---------|----------------------------------|
| bio         | String   | ''      | User biography                   |
| avatar      | String   | null    | URL to user's avatar/image       |
| phoneNumber | String   | null    | User's contact phone number      |
| address     | Object   | {}      | User's address information       |

### Address Sub-Schema

| Field    | Type   | Default | Description                  |
|----------|--------|---------|------------------------------|
| street   | String | null    | Street address               |
| city     | String | null    | City                         |
| state    | String | null    | State/province               |
| zipCode  | String | null    | Postal/ZIP code              |
| country  | String | null    | Country                      |

### Indexes

- `{ email: 1 }` - For efficient email lookups
- `{ userId: 1 }` - For efficient user ID lookups
- `{ companyId: 1 }` - For efficient company-based queries
- `{ companyId: 1, email: 1 }` - Unique compound index to ensure each email is unique within a company

### Methods

- `toJSON()` - Transforms the user object to exclude sensitive fields (password, passwordResetToken, passwordResetExpires)

### Usage Example

```javascript
const User = require('../models/User');

// Create a new user
const newUser = new User({
  userId: 'user123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'hashedPassword123',
  role: 'user',
  companyId: 'company123'
});

// Save the user to database
await newUser.save();

// Find a user by email
const user = await User.findOne({ email: 'john@example.com' });

// Update user information
user.status = 'active';
await user.save();
```

### Security Considerations

- Passwords are stored in hashed format only (not encrypted or plaintext)
- Sensitive fields are automatically removed when converting to JSON
- Role-based access control implemented via the `role` field

## Transaction Model
**Feature:** OCDI-103: Create Transaction data model

The Transaction model represents financial transactions within the OpenCap platform.

### Schema Fields

| Field                | Type     | Required | Default   | Description                                    |
|----------------------|----------|----------|-----------|------------------------------------------------|
| transactionId        | String   | Yes      | -         | Unique identifier for the transaction          |
| userId               | String   | Yes      | -         | ID of the user associated with the transaction |
| companyId            | String   | No       | null      | ID of the company for the transaction          |
| amount               | Number   | Yes      | -         | Transaction amount (positive number)           |
| currency             | String   | Yes      | -         | ISO currency code (USD, EUR, etc.)             |
| type                 | String   | Yes      | -         | Transaction type (payment, deposit, etc.)      |
| status               | String   | Yes      | -         | Current transaction status                     |
| description          | String   | No       | null      | Optional description of the transaction        |
| metadata             | Object   | No       | {}        | Additional transaction data                    |
| fees                 | Object   | No       | {}        | Transaction fee details                        |
| fees.processingFee   | Number   | No       | 0         | Processing fee amount                          |
| fees.platformFee     | Number   | No       | 0         | Platform fee amount                            |
| fees.taxAmount       | Number   | No       | 0         | Tax amount                                     |
| fees.otherFees       | Number   | No       | 0         | Any other applicable fees                      |
| processedAt          | Date     | No       | null      | Date when the transaction was processed        |
| createdAt            | Date     | Auto     | Now       | Date when the transaction was created          |
| updatedAt            | Date     | Auto     | Now       | Date when the transaction was last updated     |

### Indexes

- `{ transactionId: 1 }` - Unique index for transaction IDs
- `{ userId: 1 }` - For efficient user-based queries
- `{ companyId: 1 }` - For efficient company-based queries
- `{ status: 1 }` - For filtering transactions by status
- `{ createdAt: 1 }` - For chronological sorting and filtering
- `{ type: 1, status: 1 }` - Compound index for transaction type and status queries

### Methods

- `getNetAmount()` - Calculates the net amount (amount minus all fees)
- `getFormattedAmount()` - Returns the amount formatted with the appropriate currency symbol

### Usage Example

```javascript
const Transaction = require('../models/Transaction');

// Create a new transaction
const newTransaction = new Transaction({
  transactionId: 'txn12345',
  userId: 'user123',
  companyId: 'company123',
  amount: 500.75,
  currency: 'USD',
  type: 'payment',
  status: 'pending',
  description: 'Monthly subscription payment',
  fees: {
    processingFee: 15.00,
    platformFee: 5.00,
    taxAmount: 2.50
  }
});

// Save the transaction to database
await newTransaction.save();

// Calculate net amount
const netAmount = newTransaction.getNetAmount();
console.log(`Net amount: ${newTransaction.getFormattedAmount()}`);

// Update transaction status to completed
newTransaction.status = 'completed';
await newTransaction.save();
// The processedAt timestamp will be automatically set
```

### Validation

- Amount must be a positive number
- Currency must be a valid ISO currency code
- Transaction ID must be unique
- Required fields: transactionId, userId, amount, currency, type, status

### Lifecycle Hooks

- When a transaction status changes to 'completed', the processedAt timestamp is automatically set
- Once set, the processedAt timestamp is preserved even if the status changes again

## Company Model
The Company model represents organizations within the OpenCap platform.

**Schema Fields:**
- Company-specific fields (to be implemented)

## Financial Report Model
The Financial Report model represents financial reports generated within the OpenCap platform.

**Schema Fields:**
- Financial Report-specific fields (to be implemented)

## Share Class Model
The Share Class model represents different classes of shares for companies.

**Schema Fields:**
- Share Class-specific fields (to be implemented)

## Document Model
The Document model represents documents stored within the OpenCap platform.

**Schema Fields:**
- Document-specific fields (to be implemented)
