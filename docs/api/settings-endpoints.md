# Settings Management API Documentation

## Overview
The Settings Management API provides endpoints for managing user and company settings including notifications, security, preferences, fiscal configuration, equity defaults, and compliance settings.

**Base URL**: `/api/v1`

**Authentication**: All endpoints require Bearer token authentication

---

## User Settings Endpoints

### GET /users/settings
Retrieve current user's settings.

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "settingsId": "user_settings_abc123",
  "userId": "user_123",
  "settingsType": "user",
  "notifications": {
    "email": true,
    "push": false,
    "sms": false,
    "digest": {
      "enabled": false,
      "frequency": "weekly"
    },
    "categories": {
      "equity": true,
      "compliance": true,
      "fundraising": true,
      "documents": true,
      "system": true
    }
  },
  "security": {
    "twoFactorEnabled": false,
    "twoFactorMethod": null,
    "sessionTimeout": 30,
    "passwordExpiryDays": 90,
    "loginNotifications": true,
    "ipWhitelist": []
  },
  "preferences": {
    "theme": "light",
    "language": "en",
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "12h",
    "timezone": "America/New_York",
    "currency": "USD",
    "numberFormat": "en-US"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

### PUT /users/settings
Update current user's settings (partial updates supported).

**Authentication**: Required

**Request Body**:
```json
{
  "preferences": {
    "theme": "dark",
    "language": "es"
  },
  "notifications": {
    "email": false,
    "push": true
  },
  "security": {
    "sessionTimeout": 60,
    "twoFactorEnabled": true,
    "twoFactorMethod": "authenticator"
  }
}
```

**Validation Rules**:
- `theme`: Must be one of: "light", "dark", "auto"
- `language`: Must be one of: "en", "es", "fr", "de", "ja", "zh"
- `dateFormat`: Must be one of: "MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"
- `timeFormat`: Must be one of: "12h", "24h"
- `currency`: Must be valid ISO currency code
- `sessionTimeout`: Must be between 5 and 480 minutes
- `twoFactorMethod`: Must be one of: "sms", "email", "authenticator"

**Response**: `200 OK`
```json
{
  "settingsId": "user_settings_abc123",
  "userId": "user_123",
  "preferences": {
    "theme": "dark",
    "language": "es",
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "12h",
    "timezone": "America/New_York",
    "currency": "USD"
  },
  "notifications": {
    "email": false,
    "push": true
  },
  "updatedAt": "2024-01-20T14:22:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid settings values
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Server error

---

### POST /users/settings/reset
Reset current user's settings to default values.

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "message": "Settings reset to defaults",
  "settings": {
    "settingsId": "user_settings_new123",
    "userId": "user_123",
    "notifications": {
      "email": true,
      "push": false,
      "sms": false
    },
    "security": {
      "twoFactorEnabled": false,
      "sessionTimeout": 30
    },
    "preferences": {
      "theme": "light",
      "language": "en",
      "currency": "USD"
    }
  }
}
```

---

## Company Settings Endpoints

### GET /companies/:id/settings
Retrieve company settings by company ID.

**Authentication**: Required

**Authorization**: User must belong to the company or have `read:companies` permission

**Path Parameters**:
- `id` (string, required): Company ID

**Response**: `200 OK`
```json
{
  "settingsId": "company_settings_xyz789",
  "companyId": "company_123",
  "settingsType": "company",
  "fiscal": {
    "yearEnd": "12-31",
    "taxYearType": "calendar",
    "reportingCurrency": "USD"
  },
  "equity": {
    "defaultShareClass": "common_a",
    "defaultVestingSchedule": "4-year-1-cliff",
    "exerciseWindow": 90,
    "earlyExerciseEnabled": false,
    "autoApproveExercises": false
  },
  "compliance": {
    "require409AValuation": true,
    "valuation409AFrequency": 12,
    "requireBoardApproval": true,
    "requireSignatures": true,
    "retentionPeriod": 7,
    "dataResidency": "US"
  },
  "notifications": {
    "stakeholderUpdates": true,
    "complianceAlerts": true,
    "expirationReminders": true,
    "transactionNotifications": true,
    "reportGeneration": true
  },
  "integrations": {
    "accounting": {
      "enabled": false,
      "provider": null,
      "syncFrequency": "daily"
    },
    "payroll": {
      "enabled": false,
      "provider": null,
      "syncFrequency": "daily"
    },
    "banking": {
      "enabled": false,
      "provider": null
    }
  },
  "branding": {
    "logo": null,
    "primaryColor": "#000000",
    "secondaryColor": "#FFFFFF",
    "emailFooter": null,
    "customDomain": null
  },
  "createdAt": "2024-01-10T09:00:00Z",
  "updatedAt": "2024-01-15T16:45:00Z"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User lacks access to company settings
- `404 Not Found`: Company not found

---

### PUT /companies/:id/settings
Update company settings by company ID (partial updates supported).

**Authentication**: Required

**Authorization**: User must have `write:companies` permission

**Path Parameters**:
- `id` (string, required): Company ID

**Request Body**:
```json
{
  "fiscal": {
    "taxYearType": "fiscal",
    "reportingCurrency": "EUR"
  },
  "equity": {
    "exerciseWindow": 120,
    "earlyExerciseEnabled": true
  },
  "compliance": {
    "valuation409AFrequency": 6,
    "requireBoardApproval": false
  },
  "branding": {
    "primaryColor": "#FF5733",
    "customDomain": "equity.mycompany.com"
  }
}
```

**Validation Rules**:
- `taxYearType`: Must be one of: "calendar", "fiscal"
- `reportingCurrency`: Must be valid ISO currency code
- `exerciseWindow`: Must be between 0 and 365 days
- `valuation409AFrequency`: Must be between 1 and 36 months
- `retentionPeriod`: Must be between 1 and 99 years

**Response**: `200 OK`
```json
{
  "settingsId": "company_settings_xyz789",
  "companyId": "company_123",
  "fiscal": {
    "yearEnd": "12-31",
    "taxYearType": "fiscal",
    "reportingCurrency": "EUR"
  },
  "equity": {
    "exerciseWindow": 120,
    "earlyExerciseEnabled": true
  },
  "updatedAt": "2024-01-22T11:30:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid settings values or no updates provided
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User lacks write access to company settings
- `404 Not Found`: Company not found
- `500 Internal Server Error`: Server error

---

### POST /companies/:id/settings/reset
Reset company settings to default values.

**Authentication**: Required

**Authorization**: User must have `admin:all` permission or be a company admin

**Path Parameters**:
- `id` (string, required): Company ID

**Response**: `200 OK`
```json
{
  "message": "Company settings reset to defaults",
  "settings": {
    "settingsId": "company_settings_new789",
    "companyId": "company_123",
    "fiscal": {
      "yearEnd": "12-31",
      "taxYearType": "calendar",
      "reportingCurrency": "USD"
    },
    "equity": {
      "exerciseWindow": 90,
      "earlyExerciseEnabled": false
    },
    "compliance": {
      "require409AValuation": true,
      "valuation409AFrequency": 12
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User lacks admin access
- `404 Not Found`: Company not found

---

## Data Models

### User Settings Schema
```typescript
{
  settingsId: string (unique),
  userId: string (required, unique),
  settingsType: "user",
  notifications: {
    email: boolean,
    push: boolean,
    sms: boolean,
    digest: {
      enabled: boolean,
      frequency: "daily" | "weekly" | "monthly"
    },
    categories: {
      equity: boolean,
      compliance: boolean,
      fundraising: boolean,
      documents: boolean,
      system: boolean
    }
  },
  security: {
    twoFactorEnabled: boolean,
    twoFactorMethod: "sms" | "email" | "authenticator" | null,
    sessionTimeout: number (minutes, 5-480),
    passwordExpiryDays: number,
    loginNotifications: boolean,
    ipWhitelist: string[]
  },
  preferences: {
    theme: "light" | "dark" | "auto",
    language: "en" | "es" | "fr" | "de" | "ja" | "zh",
    dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD",
    timeFormat: "12h" | "24h",
    timezone: string,
    currency: string (ISO code),
    numberFormat: string
  },
  createdAt: datetime,
  updatedAt: datetime
}
```

### Company Settings Schema
```typescript
{
  settingsId: string (unique),
  companyId: string (required, unique),
  settingsType: "company",
  fiscal: {
    yearEnd: string (MM-DD format),
    taxYearType: "calendar" | "fiscal",
    reportingCurrency: string (ISO code)
  },
  equity: {
    defaultShareClass: string | null,
    defaultVestingSchedule: string,
    exerciseWindow: number (days, 0-365),
    earlyExerciseEnabled: boolean,
    autoApproveExercises: boolean
  },
  compliance: {
    require409AValuation: boolean,
    valuation409AFrequency: number (months, 1-36),
    requireBoardApproval: boolean,
    requireSignatures: boolean,
    retentionPeriod: number (years, 1-99),
    dataResidency: string
  },
  notifications: {
    stakeholderUpdates: boolean,
    complianceAlerts: boolean,
    expirationReminders: boolean,
    transactionNotifications: boolean,
    reportGeneration: boolean
  },
  integrations: {
    accounting: {
      enabled: boolean,
      provider: string | null,
      syncFrequency: "daily" | "weekly" | "monthly"
    },
    payroll: {
      enabled: boolean,
      provider: string | null,
      syncFrequency: "daily" | "weekly" | "monthly"
    },
    banking: {
      enabled: boolean,
      provider: string | null
    }
  },
  branding: {
    logo: string | null,
    primaryColor: string (hex),
    secondaryColor: string (hex),
    emailFooter: string | null,
    customDomain: string | null
  },
  createdAt: datetime,
  updatedAt: datetime
}
```

---

## Default Behavior

1. **Automatic Creation**: Settings are automatically created with default values when a user or company is created.

2. **Lazy Creation**: If settings don't exist when retrieved via GET endpoints, they are automatically created with defaults.

3. **Partial Updates**: PUT endpoints support partial updates - only specified fields are updated, others remain unchanged.

4. **Deep Merge**: Nested objects are deep-merged, so updating `preferences.theme` won't overwrite other preference fields.

5. **Protected Fields**: The following fields cannot be updated via PUT requests:
   - `settingsId`
   - `userId` / `companyId`
   - `settingsType`
   - `createdAt`

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200 OK`: Success
- `400 Bad Request`: Invalid input or validation failure
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Related Documentation

- [Authentication & Authorization](./authentication.md)
- [User Management API](./user-endpoints.md)
- [Company Management API](./company-endpoints.md)
- [RBAC Permissions](../RBAC_PERMISSIONS.md)

---

**Issue**: #189 - Add Settings Management Endpoints
**Last Updated**: 2024-02-03
