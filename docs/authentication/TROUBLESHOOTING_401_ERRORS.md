# Troubleshooting 401 Unauthorized Errors

**Issue**: #250 - Valuations Page 401 Unauthorized Error

This guide helps diagnose and fix 401 Unauthorized errors when accessing protected API endpoints.

## Quick Diagnosis

### 1. Check Token Debug Endpoint

Send a request to the debug endpoint with your token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:5000/api/v1/auth/debug-token
```

**Possible Responses:**

#### No Authorization Header
```json
{
  "success": false,
  "debug": {
    "hasAuthHeader": false,
    "message": "No Authorization header found",
    "headers": ["content-type", "user-agent", ...]
  }
}
```
**Fix**: Ensure your frontend sends the Authorization header.

#### Missing "Bearer " Prefix
```json
{
  "success": false,
  "debug": {
    "hasAuthHeader": true,
    "hasBearer": false,
    "message": "Authorization header does not start with \"Bearer \"",
    "authHeaderPrefix": "eyJhbGciOiJIUzI1NiI..."
  }
}
```
**Fix**: Add "Bearer " prefix to your token.

#### Empty Token
```json
{
  "success": false,
  "debug": {
    "hasAuthHeader": true,
    "hasBearer": true,
    "hasToken": false,
    "message": "Token is empty after \"Bearer \""
  }
}
```
**Fix**: Ensure token is properly stored and retrieved.

#### Valid Token Structure
```json
{
  "success": true,
  "debug": {
    "hasAuthHeader": true,
    "hasBearer": true,
    "hasToken": true,
    "tokenInfo": {
      "header": { "alg": "HS256", "typ": "JWT" },
      "payload": {
        "userId": "user_123",
        "email": "user@example.com",
        "role": "admin",
        "exp": "2026-02-06T12:00:00.000Z",
        "iat": "2026-02-05T12:00:00.000Z",
        "isExpired": false
      },
      "signatureLength": 43
    },
    "message": "Token structure is valid"
  }
}
```
**Note**: If `isExpired: true`, you need to refresh your token.

## Common Causes and Solutions

### 1. Token Not Being Sent

**Symptom**: No Authorization header in request

**Frontend Check**:
```javascript
// Check if token exists
const token = localStorage.getItem('token');
console.log('Token exists:', !!token);

// Check if header is being sent
fetch('/api/v1/valuations', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(response => {
  console.log('Response status:', response.status);
});
```

**Fix**:
```javascript
// Ensure token is stored after login
localStorage.setItem('token', loginResponse.token);

// Create axios instance with default headers
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### 2. Incorrect Token Format

**Symptom**: Missing "Bearer " prefix

**Wrong**:
```javascript
headers: {
  'Authorization': token  // ❌ Missing "Bearer "
}
```

**Correct**:
```javascript
headers: {
  'Authorization': `Bearer ${token}`  // ✅ Correct format
}
```

### 3. Token Expired

**Symptom**: Token was valid but is now expired

**Check Expiration**:
```javascript
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch (e) {
    return true;
  }
}

const token = localStorage.getItem('token');
if (isTokenExpired(token)) {
  console.log('Token is expired, need to refresh or re-login');
}
```

**Fix**: Implement token refresh logic
```javascript
// Auto-refresh token before it expires
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        const refreshResponse = await axios.post('/api/v1/auth/token/refresh');
        localStorage.setItem('token', refreshResponse.data.token);

        // Retry original request
        error.config.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
        return axios(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### 4. Token Blacklisted (After Logout)

**Symptom**: Token was valid but is now blacklisted

**Cause**: User logged out, invalidating the token

**Fix**: Clear token on logout
```javascript
// Logout function
async function logout() {
  const token = localStorage.getItem('token');

  try {
    // Call logout endpoint to blacklist token
    await api.post('/api/v1/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear local token
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}
```

### 5. User Account Inactive

**Symptom**: 403 Forbidden (not 401)

**Response**:
```json
{
  "message": "Account is not active"
}
```

**Fix**: Contact administrator to activate account.

### 6. Invalid JWT Secret

**Symptom**: All tokens are rejected as invalid

**Backend Check**:
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Should not be empty or default
```

**Fix**: Ensure `JWT_SECRET` environment variable is properly set in backend `.env` file.

## Authentication Flow

### Correct Flow

1. **User Login**
   ```
   POST /api/v1/auth/login
   { "email": "user@example.com", "password": "***" }
   ```

2. **Store Token**
   ```javascript
   localStorage.setItem('token', response.data.token);
   ```

3. **Send Token with Requests**
   ```javascript
   headers: { 'Authorization': `Bearer ${token}` }
   ```

4. **Handle Expiration**
   ```javascript
   if (response.status === 401) {
     // Try refresh or redirect to login
   }
   ```

## Backend Authentication Middleware

The authentication middleware is already correctly configured on valuation routes:

```javascript
// routes/v1/valuation409ARoutes.js
const { authenticateToken } = require('../../middleware/authMiddleware');
router.use(authenticateToken); // Applied to all routes

// routes/v1/valuationPartnerRoutes.js
const { authenticateToken } = require('../../middleware/authMiddleware');
router.use(authenticateToken); // Applied to all routes
```

The middleware validates:
1. ✅ Authorization header exists
2. ✅ Header starts with "Bearer "
3. ✅ Token is not empty
4. ✅ Token is valid JWT
5. ✅ Token is not expired
6. ✅ Token is not blacklisted
7. ✅ User exists in database
8. ✅ User account is active

## Testing Authentication

### Manual Test with cURL

```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.token')

# 2. Test valuation endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/valuations

# Expected: 200 OK with valuations list
```

### Frontend Test

```javascript
// Create a test file: frontend/src/utils/authTest.js
export async function testAuth() {
  const tests = {
    'Has token': !!localStorage.getItem('token'),
    'Token format': /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(localStorage.getItem('token') || ''),
    'Token expired': isTokenExpired(localStorage.getItem('token'))
  };

  console.table(tests);

  // Test API call
  try {
    const response = await fetch('/api/v1/valuations', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    console.log('API Response:', response.status, response.statusText);

    if (response.status === 401) {
      const body = await response.json();
      console.error('401 Error:', body.message);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Call from browser console
// testAuth()
```

## Monitoring and Debugging

### Enable Debug Logging

In development, authentication errors are automatically logged:

```json
{
  "timestamp": "2026-02-05T12:00:00.000Z",
  "errorType": "Invalid token",
  "method": "GET",
  "path": "/api/v1/valuations",
  "hasAuthHeader": true,
  "authHeaderPrefix": "Bearer eyJ..."
}
```

### Check Server Logs

```bash
# Start server with logs
npm run dev

# Look for authentication errors
[AUTH ERROR] {"errorType":"Invalid token",...}
```

## Production Checklist

Before deploying to production:

- [ ] JWT_SECRET is set to a strong, random value
- [ ] Frontend stores token securely (httpOnly cookies recommended for production)
- [ ] Token refresh logic is implemented
- [ ] Logout properly clears tokens
- [ ] Error messages don't expose sensitive information
- [ ] Authentication errors are logged for monitoring
- [ ] HTTPS is enforced for all API requests

## Related Documentation

- [Authentication Middleware](../middleware/authMiddleware.md)
- [API Documentation](../API_Documentation_Sprint1.md)
- [Security Best Practices](../security/SECURITY_AUDIT_REPORT.md)

## Need Help?

1. Check debug endpoint: `GET /api/v1/auth/debug-token`
2. Review server logs for `[AUTH ERROR]` entries
3. Verify token in browser DevTools > Application > Local Storage
4. Test with cURL to isolate frontend vs backend issues

---

**Last Updated**: 2026-02-05
**Related Issue**: #250
