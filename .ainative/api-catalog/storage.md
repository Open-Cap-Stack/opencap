# Storage APIs

**Endpoint Count:** 7

## Overview

This category contains 7 endpoints for storage operations.


## Profile


### `GET /v1/profiles/`

**Summary:** Get Profile

Legacy endpoint for getting profile
Redirects to /me endpoint

DEPRECATED: Use GET /v1/profiles/me instead

**Success Response (200):** Successful Response

---

### `PUT /v1/profiles/`

**Summary:** Update User Profile

Legacy endpoint for updating profile

DEPRECATED: Use PATCH /v1/profiles/me instead

**Success Response (200):** Successful Response

---

### `GET /v1/profiles/me`

**Summary:** Get Own Profile

Get current user's profile information

Returns complete profile data including:
- Personal information
- Community profile fields
- Privacy settings
- Social statistics (followers, following, friends)

Requires authentication.

Refs #915

**Success Response (200):** Successful Response

---

### `PATCH /v1/profiles/me`

**Summary:** Update Own Profile

Update current user's profile

Allows updating:
- Bio
- Avatar URL
- Cover photo URL
- Location
- Website
- Ask Me Anything section
- Privacy settings (profile_visibility, show_online_status, allow_messages_from)

All fields are optional - only provided fields will be updated.
Empty strings are converted to None.
URLs are validated for proper format.

Requires authentication.

Args:
    profile_data: Profile update data (all fields optional)

Returns:
    Updated profile data

Refs #915

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `PATCH /v1/profiles/me/privacy`

**Summary:** Update Privacy Settings

Update current user's privacy settings

Allows updating:
- profile_visibility: 'public', 'friends', or 'private'
- show_online_status: boolean
- allow_messages_from: 'everyone', 'friends', or 'none'

All fields are optional - only provided fields will be updated.

Requires authentication.

Args:
    privacy_data: Privacy settings update data

Returns:
    Updated profile data with new privacy settings

Refs #915

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/profiles/stats`

**Summary:** Get Profile Stats

Get detailed user statistics with real GitHub analytics

Legacy endpoint maintained for backward compatibility.

DEPRECATED: Stats are now included in GET /v1/profiles/me

**Success Response (200):** Successful Response

---

### `GET /v1/profiles/{user_id}`

**Summary:** Get User Profile

Get user profile by ID with privacy enforcement

Privacy logic:
- Public profiles: visible to everyone
- Friends-only profiles: visible to friends only
- Private profiles: only visible to the user themselves
- Blocked users: cannot view the profile

Returns minimal profile data if viewer doesn't have access.

Args:
    user_id: UUID of the user whose profile to retrieve

Returns:
    Full profile or minimal profile based on privacy settings

Refs #915

**Parameters:**

- `user_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
