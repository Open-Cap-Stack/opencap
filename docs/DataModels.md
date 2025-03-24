# OpenCap Data Models

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
