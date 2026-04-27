# Distributed Chat App

Production-grade monorepo foundation for a scalable distributed chat system.

## Phase 1 Scope

- Turborepo workspace setup
- Strict TypeScript configuration in all apps
- Next.js web foundation (App Router + Tailwind)
- Express API foundation with health route
- Socket.io real-time server foundation
- BullMQ worker foundation with Redis connection
- Shared packages for types, utilities, and config
- ESLint + Prettier repository standards
- Basic Dockerfiles for each runtime service

## Monorepo Layout

- apps/web: Next.js frontend
- apps/api: REST API service (Express)
- apps/socket: WebSocket service (Socket.io)
- apps/worker: Background processing service (BullMQ)
- packages/types: Shared domain interfaces
- packages/utils: Shared utility helpers (includes logger)
- packages/config: Shared environment loader
- packages/ui: Shared UI package placeholder

## Prerequisites

- Node.js 20+
- npm 10+
- Redis instance (for worker)

## Setup

1. Copy environment template:

   cp .env.example .env

   Required variables are validated at startup for the API service.

2. Install dependencies:

   npm install

3. Run all services via Turborepo:

   npm run dev

   Note: API fails fast if required environment variables are missing.
   Note: Worker runs in standby mode when Redis is unavailable and retries automatically.

## Validation Endpoints

- API health check: http://localhost:4000/health
- Web app placeholder: http://localhost:3000
- Socket server port: 4001

## Root Scripts

- npm run dev: start all workspace dev processes
- npm run build: build all workspaces
- npm run lint: lint all workspaces
- npm run typecheck: run TypeScript checks across workspaces

## Notes

- This phase intentionally excludes business logic and feature implementation.
- Service folders are scaffolded for clean modular growth in later phases.
