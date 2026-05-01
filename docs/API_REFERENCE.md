# API Reference - Authentication Endpoints

**Base URL:** `http://localhost:4000/api/v1`

---

## Authentication Endpoints

### 1. Sign Up

Create a new user account.

```http
POST /auth/signup
Content-Type: application/json

{
  "email": "test@example.com",
  "username": "testuser",
  "password": "password123"
}
```

**Success Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "username": "testuser",
    "created_at": "2024-04-30T14:03:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid input (missing fields, weak password)
- `409` - Email already exists
- `500` - Server error

---

### 2. Login

Authenticate with email and password.

```http
POST /auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE3MTQzNjYwNjAsImV4cCI6MTcxNDM2NzU2MH0.xyz",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE3MTQzNjYwNjAsImV4cCI6MTcyMzAwNjA2MH0.abc",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "username": "testuser",
    "created_at": "2024-04-30T14:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid input
- `401` - Invalid credentials
- `429` - Too many login attempts (rate limited)
- `500` - Server error

**Rate Limiting:**
- Max 5 login attempts per IP per 15-minute window
- Max 10 login attempts per account per 1-hour window

---

### 3. Refresh Token

Get a new access token using a refresh token.

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE3MTQzNjYxNjAsImV4cCI6MTcxNDM2NzY2MH0.new",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE3MTQzNjYxNjAsImV4cCI6MTcyMzAwNjE2MH0.rotated"
}
```

**Error Responses:**
- `400` - Invalid input
- `403` - Invalid or expired refresh token, token reuse detected
- `429` - Too many refresh attempts (rate limited)
- `500` - Server error

**Features:**
- Token rotation on each refresh
- Reuse detection: If same refresh token used twice → all user sessions revoked
- New tokens returned: access token + rotated refresh token

---

### 4. Logout

Invalidate the refresh token and end the session.

```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `400` - Invalid input
- `401` - Unauthorized (no token provided)
- `500` - Server error

**Notes:**
- Idempotent: Logging out twice returns 200 both times
- Invalid tokens also return 200 (security: prevent token enumeration)

---

### 5. Get Current User

Get authenticated user profile.

```http
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "message": "User fetched successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "username": "testuser",
    "created_at": "2024-04-30T14:00:00.000Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized (missing or invalid token)
- `500` - Server error

**Notes:**
- Requires valid Bearer token in Authorization header
- Used to verify session is still active

---

## Headers

### Request Headers

All POST/GET requests should include:

```
Content-Type: application/json
```

Protected endpoints require:

```
Authorization: Bearer <access_token>
```

### Response Headers

All responses include:

```
Content-Type: application/json
X-Request-ID: <uuid>
Date: <timestamp>
```

---

## Error Format

All error responses follow this format:

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

Common errors:

| Status | Message | Meaning |
|--------|---------|---------|
| 400 | Bad Request | Invalid input or missing fields |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Access denied (reused token, revoked session) |
| 409 | Conflict | Resource already exists (email) |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Server Error | Server error |

---

## Authentication Flow

### Step 1: Sign Up

```bash
curl -X POST http://localhost:4000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "username",
    "password": "password123"
  }'
```

### Step 2: Login

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` and `refreshToken` from response.

### Step 3: Make Authenticated Request

```bash
curl -X GET http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

### Step 4: Refresh Token (When Access Expires)

```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

Get new `accessToken` and `refreshToken` from response.

### Step 5: Logout

```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

---

## Token Details

### Access Token (JWT)

**Expiration:** 15 minutes  
**Payload:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1714366060,
  "exp": 1714367060
}
```

**Usage:** Include in `Authorization: Bearer <token>` header

### Refresh Token (JWT)

**Expiration:** 7–30 days (configurable)  
**Stored:** Hashed in database  
**Payload:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1714366060,
  "exp": 1723006060
}
```

**Usage:** Send in POST body to `/auth/refresh` to get new access token

---

## Validation Rules

### Email
- Must be valid email format
- Must be unique across all users
- Example: `user@example.com`

### Username
- Required for signup
- Min length: 1 character
- Max length: 255 characters
- Example: `john_doe`

### Password
- Min length: 8 characters
- Required for signup and login
- Hashed with bcrypt (12 rounds) before storage
- Example: `SecurePass123!`

---

## Rate Limiting

### Signup Endpoint
- **Limit:** 10 requests per IP per hour
- **Response on limit:** 429 Too Many Requests

### Login Endpoint
- **Limit:** 5 attempts per IP per 15 minutes
- **Limit:** 10 attempts per account per hour
- **Response on limit:** 429 Too Many Requests
- **Reason:** Prevent brute force attacks

### Refresh Endpoint
- **Limit:** 20 requests per IP per hour
- **Response on limit:** 429 Too Many Requests

### General Rate Limit Headers

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1714367060
```

---

## Security Best Practices

### ✅ DO

- Store tokens securely (sessionStorage or secure cookie)
- Include `Authorization` header on every protected request
- Refresh access token before expiry
- Clear tokens on logout
- Validate email and password on client-side before sending
- Handle errors gracefully

### ❌ DON'T

- Store tokens in plain localStorage (vulnerable to XSS)
- Send tokens in URL or query parameters
- Log or display tokens in console
- Hardcode tokens in source code
- Send passwords in plain text (always use HTTPS)
- Trust client-side validation alone

---

## Example: Complete Auth Flow (JavaScript)

```javascript
// 1. Signup
const signupResponse = await fetch('http://localhost:4000/api/v1/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    username: 'username',
    password: 'password123'
  })
});

// 2. Login
const loginResponse = await fetch('http://localhost:4000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();

// 3. Make authenticated request
const meResponse = await fetch('http://localhost:4000/api/v1/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// 4. Refresh when needed
const refreshResponse = await fetch('http://localhost:4000/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

const { accessToken: newToken } = await refreshResponse.json();

// 5. Logout
await fetch('http://localhost:4000/api/v1/auth/logout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});
```

---

## Troubleshooting

### "Failed to fetch" Error

**Cause:** API server not running or wrong URL

**Solution:**
```bash
# Check API is running on port 4000
npm run -w @chat-app/api dev

# Verify URL: http://localhost:4000
curl http://localhost:4000/health
```

### "Invalid credentials" After Signup

**Cause:** Credentials don't match what was registered

**Solution:** Make sure email and password are exactly as you signed up

### "Token expired" (401)

**Cause:** Access token has expired (15 minute expiry)

**Solution:** Call `/auth/refresh` with refresh token to get new access token

### "Too many requests" (429)

**Cause:** Rate limiting triggered

**Solution:** Wait the specified time and retry. Check `X-RateLimit-Reset` header.

### "Unauthorized" (401) on Protected Route

**Cause:** Missing or invalid Authorization header

**Solution:**
- Include header: `Authorization: Bearer <token>`
- Make sure token is valid and not expired
- Call `/auth/me` to verify token

---

## Testing with cURL

```bash
# Health check
curl http://localhost:4000/health

# Signup
curl -X POST http://localhost:4000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get current user (replace TOKEN)
curl -X GET http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer TOKEN"

# Logout (replace TOKEN)
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"TOKEN"}'
```

---

## API Status

- ✅ All endpoints operational
- ✅ Database connectivity verified
- ✅ Rate limiting active
- ✅ Error handling implemented
- ✅ JWT verification working
- ✅ Token rotation enabled

**Last Updated:** 2024-04-30  
**API Version:** 1.0  
**Environment:** Development/Production
