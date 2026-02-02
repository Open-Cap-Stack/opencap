# 🔔 Notification Preferences APIs

**Endpoint Count:** 2

## Overview

This category contains 2 endpoints for 🔔 notification preferences operations.


## 🔔 Notification Preferences


### `GET /v1/settings/notifications/preferences`

**Summary:** Get Notification Preferences

Get user's notification preferences (Issue #134)

Retrieves the current user's notification preferences.
Auto-creates default preferences if none exist.

**Authentication Required**: Yes (JWT token or API key)

**Returns**:
- user_id: UUID of the user
- email_notifications: Boolean for email notifications
- push_notifications: Boolean for push notifications
- sms_notifications: Boolean for SMS notifications
- marketing_emails: Boolean for marketing emails
- product_updates: Boolean for product updates
- security_alerts: Boolean for security alerts
- created_at: Timestamp of creation
- updated_at: Timestamp of last update

**Success Response (200):** Successful Response

---

### `PUT /v1/settings/notifications/preferences`

**Summary:** Update Notification Preferences

Update user's notification preferences (Issue #135)

Updates the current user's notification preferences.
Creates new preferences with provided values if none exist.

**Authentication Required**: Yes (JWT token or API key)

**Request Body**:
- email_notifications: Boolean (optional, default: true)
- push_notifications: Boolean (optional, default: false)
- sms_notifications: Boolean (optional, default: false)
- marketing_emails: Boolean (optional, default: false)
- product_updates: Boolean (optional, default: true)
- security_alerts: Boolean (optional, default: true)

**Returns**: Updated notification preferences

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
