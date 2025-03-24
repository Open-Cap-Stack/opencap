# OpenCap Data Models

**Version**: 1.0  
**Date**: March 23, 2025  
**Status**: Draft  

This document describes the core data models used throughout the OpenCap platform.

## Models

### User

The User model represents individuals who have access to the OpenCap platform.

**Schema Fields:**
- `userId`: Unique identifier for the user
- `name`: Full name of the user
- `username`: Username for authentication
- `email`: Email address (unique)
- `password`: Encrypted password
- `role`: User role (admin, user, etc.)

### Transaction

The Transaction model represents financial transactions within the OpenCap platform.

**Schema Fields:**
- `transactionId`: Unique identifier for the transaction
- `userId`: ID of the user associated with the transaction
- `companyId`: ID of the company associated with the transaction
- `amount`: Transaction amount (positive number)
- `currency`: ISO currency code (USD, EUR, etc.)
- `type`: Transaction type (payment, deposit, withdrawal, etc.)
- `status`: Current status of the transaction (pending, completed, failed, etc.)
- `description`: Optional description of the transaction
- `metadata`: Additional transaction data (JSON object)
- `fees`: Transaction fee details
  - `processingFee`: Processing fee amount
  - `platformFee`: Platform fee amount
  - `taxAmount`: Tax amount
  - `otherFees`: Any other fees
- `processedAt`: Date when the transaction was processed (set automatically when status changes to completed)
- `createdAt`: Date when the transaction was created
- `updatedAt`: Date when the transaction was last updated

**Methods:**
- `getNetAmount()`: Calculates the net amount (amount minus all fees)
- `getFormattedAmount()`: Returns the amount formatted with the appropriate currency symbol

**Validation:**
- Amount must be a positive number
- Currency must be a valid ISO currency code
- Transaction ID must be unique
- Required fields: transactionId, userId, amount, currency, type, status

### Company

The Company model represents organizations within the OpenCap platform.

**Schema Fields:**
- Company-specific fields (to be implemented)

### Financial Report

The Financial Report model represents financial reports generated within the OpenCap platform.

**Schema Fields:**
- Financial Report-specific fields (to be implemented)

### Share Class

The Share Class model represents different classes of shares for companies.

**Schema Fields:**
- Share Class-specific fields (to be implemented)

### Document

The Document model represents documents stored within the OpenCap platform.

**Schema Fields:**
- Document-specific fields (to be implemented)
