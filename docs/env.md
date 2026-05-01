# Environment Variables

## Backend

DATABASE_URL=
JWT_SECRET=
REDIS_URL=
AUTH_STORAGE_BACKEND=postgres
AUTH_TRUST_PROXY=false
AUTH_LOGIN_RATE_LIMIT_MAX=10
AUTH_REFRESH_RATE_LIMIT_MAX=30
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_CLEANUP_INTERVAL_MS=3600000
AUTH_RATE_LIMIT_RETENTION_MS=86400000
AUTH_REFRESH_TOKEN_RETENTION_MS=2592000000
AUTH_ADMIN_API_KEY=
AUTH_REAL_POSTGRES_TEST=0

## Frontend

NEXT_PUBLIC_API_URL=

## Socket

SOCKET_PORT=

## Notes

* Never commit .env files
* Use .env.example
* JWT_SECRET must be at least 32 characters and must not be the default placeholder
* AUTH_ADMIN_API_KEY should be set for secure admin session revocation endpoints
* AUTH_REAL_POSTGRES_TEST is only for running the real PostgreSQL integration test stage
