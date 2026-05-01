# User Experience Flow

## 1. Login/Register Screen

```
┌─────────────────────────────────────────┐
│                                         │
│     ⚡ Welcome back                     │
│        Log in to open your chat          │
│        workspace                        │
│                                         │
│  [📧 Email input field................] │
│  [🔑 Password input field............] │
│                                         │
│  [LOGIN BUTTON - "Login"]               │
│                                         │
│  Need an account? Register (link)       │
│                                         │
│  ✓ Authentication successful message    │
│    OR                                   │
│  ✗ Invalid credentials error           │
│                                         │
└─────────────────────────────────────────┘
```

### Available Test Credentials
- Email: `test@example.com`
- Username: `testuser` (for signup)
- Password: `password123`

---

## 2. Chat Dashboard (After Login)

```
┌────────────────────────────────────────────────────────────────┐
│ test@example.com [Check Session] [Logout]                      │
├────────────────────────────────────────────────────────────────┤
│ 🔍 Search...                │                                  │
│                              │ 📱 Chat Window                   │
│ ─────────────────────────    │ ─────────────────────────        │
│ ✓ Sarah Chen                 │ Sarah Chen                       │
│   2 min ago                  │ ──────────────────────────       │
│   Did you see the new...     │                                  │
│                              │ Hi! Did you see...              │
│ 🔘 Alex Kumar                │                                  │
│   9 min ago                  │ 👋 Hey! Did you see the new     │
│   The API performance...     │    design mockups?              │
│                              │                                  │
│ 🚀 Product Launch            │ Just looked at them! Really     │
│   1 min ago (3)              │ impressed with the flow 🎨      │
│   Great! Looking forward...  │                                  │
│                              │ Thanks! I made a few            │
│ 🔘 Jordan Lee                │ iterations based on feedback.   │
│   120 min ago (1)            │ Let me send the updated         │
│   Hi! Will you be at...      │ version.                        │
│                              │                                  │
│ 💻 Engineering Team          │ Perfect, I'll review and get    │
│   35 min ago                 │ back to you by EOD 👍            │
│   Thanks! Let me know...     │                                  │
│                              │                                  │
│                              │ [Message input + send...]       │
│                              │                                  │
│ ☀️ 🔍 📌                      │                                  │
└────────────────────────────────────────────────────────────────┘
```

### Key Features
- **Authenticated User Info**: Email shown in top-right corner
- **Session Controls**: "Check Session" (verify token validity) and "Logout" buttons
- **Chat List**: 5+ real-looking conversations
- **Chat Window**: Full message history with sender, content, and timestamps
- **User Avatars**: Generated from user data
- **Online Status**: Green dot for online users
- **Unread Badges**: Shows unread message count
- **Search**: Find chats by title
- **Dark/Light Mode**: Toggle theme

---

## 3. Mock Chat Data

### Users (5 Total)
1. **You** - `you@chat-app.dev` (authenticated user)
2. **Sarah Chen** - `sarah@chat-app.dev` (design)
3. **Alex Kumar** - `alex@chat-app.dev` (backend)
4. **Emma Wilson** - `emma@chat-app.dev` (QA)
5. **Jordan Lee** - `jordan@chat-app.dev` (frontend)

### Chats (5 Total)
1. **Sarah Chen** (DM) - 4 recent messages about design feedback
2. **Alex Kumar** (DM) - 2 messages about API optimization
3. **🚀 Product Launch** (Group) - 4 messages about launch coordination
4. **Jordan Lee** (DM) - 1 old message (2400 min ago)
5. **💻 Engineering Team** (Group) - 3 messages about PR reviews

### Sample Messages
```
Sarah Chen: "Did you see the new design mockups?"
You: "Just looked at them! Really impressed with the flow 🎨"
Sarah Chen: "Thanks! I made a few iterations based on feedback. Let me send the updated version."
You: "Perfect, I'll review and get back to you by EOD 👍"
```

---

## 4. Authentication Backend

### API Endpoints

```
POST   /api/v1/auth/signup
       Request: { email, username, password }
       Response: { message: "User created successfully" }

POST   /api/v1/auth/login
       Request: { email, password }
       Response: { accessToken, refreshToken, user: { id, email, username } }

POST   /api/v1/auth/refresh
       Request: { refreshToken }
       Response: { accessToken }

POST   /api/v1/auth/logout
       Request: { refreshToken? }
       Response: { message: "Logged out successfully" }

GET    /api/v1/auth/me
       Header: Authorization: Bearer <token>
       Response: { user: { id, email, username, created_at } }
```

### Security Headers
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5. Session Flow Diagram

```
Start
  │
  ├─→ Visit http://localhost:3000
  │     │
  │     └─→ Not Authenticated?
  │          │
  │          └─→ Show Login/Signup Form
  │               │
  │               ├─→ New User? → Fill Email/Username/Password
  │               │               │
  │               │               └─→ Click "Create account"
  │               │                   │
  │               │                   └─→ POST /auth/signup
  │               │                       │
  │               │                       └─→ Switch to Login Mode
  │               │
  │               └─→ Existing User? → Fill Email/Password
  │                                     │
  │                                     └─→ Click "Login"
  │                                         │
  │                                         └─→ POST /auth/login
  │                                             │
  ├─→ Authenticated!
      │
      ├─→ Chat Dashboard Renders
      │   │
      │   ├─→ Show Email + Session Controls
      │   ├─→ Load 5 Chats
      │   ├─→ Load Mock Messages
      │   ├─→ Show User Avatars
      │   └─→ Enable Chat Switching
      │
      ├─→ User Interactions
      │   │
      │   ├─→ Click "Check Session" → GET /auth/me
      │   ├─→ Click Chat → Load Messages
      │   └─→ Type Message → Optimistic UI Update
      │
      └─→ User Clicks "Logout"
          │
          └─→ POST /auth/logout
              │
              └─→ Clear Tokens
              │
              └─→ Reset to Login Screen
```

---

## 6. Technical Stack

### Backend
```
Node.js + Express
│
├─ Authentication
│  ├─ bcryptjs (password hashing)
│  ├─ jsonwebtoken (JWT tokens)
│  └─ Zod (validation)
│
├─ Database
│  ├─ PostgreSQL (production)
│  ├─ pg (driver)
│  └─ Prisma ORM
│
├─ Security
│  ├─ Rate limiting (token bucket)
│  ├─ CORS
│  ├─ Helmet (headers)
│  └─ dotenv (env vars)
│
└─ Development
   ├─ TypeScript
   ├─ ESLint
   ├─ Supertest (API testing)
   └─ Jest (unit testing)
```

### Frontend
```
Next.js 14 + React
│
├─ State Management
│  ├─ Zustand (chat store)
│  ├─ React Hooks (auth state)
│  └─ Context API
│
├─ Styling
│  ├─ Tailwind CSS
│  └─ Responsive Design
│
├─ HTTP Client
│  └─ Fetch API (native)
│
├─ Utilities
│  ├─ Date formatting
│  ├─ Message virtualization
│  └─ Search/filter
│
└─ Development
   ├─ TypeScript
   ├─ ESLint
   └─ Next.js built-in
```

---

## 7. Testing Checklist

- [ ] **Signup Flow**
  - [ ] Create new user with email/username/password
  - [ ] See success message
  - [ ] Auto-switch to login form

- [ ] **Login Flow**
  - [ ] Login with correct credentials
  - [ ] See "Login successful" message
  - [ ] Chat dashboard appears
  - [ ] Email shown in top-right

- [ ] **Chat Dashboard**
  - [ ] 5 chats visible in sidebar
  - [ ] Click chat to view messages
  - [ ] View user avatars and names
  - [ ] See message timestamps
  - [ ] Search chats by name

- [ ] **Session Management**
  - [ ] Click "Check Session" → Shows success
  - [ ] Token is valid and user data returned
  - [ ] Logout clears all state
  - [ ] Return to login screen

- [ ] **Error Handling**
  - [ ] Wrong password → "Invalid credentials"
  - [ ] Non-existent user → "User not found"
  - [ ] Missing fields → "Required"
  - [ ] API unreachable → "Unable to reach API"

---

## 8. Environment Setup

### To Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
# Backend (.env)
API_PORT=4000
JWT_SECRET=your-secret-here-32-chars-minimum
AUTH_STORAGE_BACKEND=memory

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:4000

# 3. Start servers
# Terminal 1
npm run -w @chat-app/api dev

# Terminal 2
npm run -w @chat-app/web dev

# 4. Open browser
# http://localhost:3000
```

---

## 9. Success Indicators

✅ **You'll know everything is working when:**

1. **Login page loads** without errors
2. **Signup creates user** and shows success
3. **Login accepts credentials** and shows chat
4. **Chat dashboard displays** 5 real-looking conversations
5. **Messages show** with proper timestamps
6. **"Check Session" works** and shows your user info
7. **"Logout" clears state** and returns to login
8. **Backend API logs** show successful requests
9. **Frontend console** is error-free
10. **UI is responsive** on mobile and desktop

---

## 10. Demo Script (5 Minutes)

```
1. Open http://localhost:3000
   → See login form

2. Click "Need an account? Register"
   → Fill in new credentials
   → Click "Create account"
   → See success message

3. Login with new credentials
   → Click "Login"
   → See chat dashboard appear

4. Click different chats
   → See different conversations
   → Notice user avatars and status

5. Click "Check Session"
   → See modal with your user info
   → Confirm token is valid

6. Click "Logout"
   → See login form again
   → Try to access /[chatId] directly
   → Redirected back to login

7. Show backend logs
   → POST /signup
   → POST /login
   → GET /me
   → POST /logout
   → All successful!
```

---

## Ready to Test! 🚀

Your authentication system is complete and the chat dashboard is fully integrated.

**Visit: http://localhost:3000**

Start by signing up with any email/username/password, then log in to see the chat dashboard.

Happy testing! 🎉
