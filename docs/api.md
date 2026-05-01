# API Documentation

## Base URL

/api/v1

## Auth

### POST /auth/signup

Create new user

### POST /auth/login

Authenticate user

### POST /auth/refresh

Issue a new access token and rotated refresh token using refresh token

### POST /auth/logout

Invalidate refresh token session (idempotent)

### GET /auth/me

Get authenticated user profile

### GET /auth/sessions

List session telemetry for authenticated user

### POST /auth/sessions/revoke

Revoke one session family for authenticated user

### POST /auth/sessions/revoke-all

Revoke all sessions for authenticated user

### POST /auth/admin/users/:userId/sessions/revoke-all

Admin endpoint to revoke all sessions for a user (requires `x-admin-api-key`)

---

## User

### GET /users/me

Get current user

---

## Chat

### POST /chats

Create chat

### GET /chats

Get user chats

---

## Messages

### GET /messages/:chatId

Fetch messages

---

## Media

### POST /media/upload

Upload file

---

## Standards

* JSON responses
* JWT authentication
* Proper HTTP status codes
