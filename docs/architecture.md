# System Architecture

## Overview

The system is designed as a distributed architecture with decoupled services.

## Components

### 1. API Server

Handles REST APIs, authentication, and business logic.

### 2. WebSocket Server

Maintains real-time connections and event-based communication.

### 3. Message Queue (Redis)

Acts as a buffer between message ingestion and processing.

### 4. Worker Service

Consumes messages from the queue and persists them.

### 5. Database (PostgreSQL)

Stores users, chats, messages, and relationships.

### 6. Cache Layer (Redis)

Used for presence, session, and fast lookups.

## Message Flow

1. Client sends message via WebSocket
2. Server pushes message to Redis queue
3. Worker processes message
4. Message stored in DB
5. Delivered to recipients

## Scaling Strategy

* Horizontal scaling of API & socket servers
* Redis Pub/Sub for cross-instance communication
* Load balancer for traffic distribution

## Key Design Decisions

* WebSockets over HTTP polling
* Queue-based processing for reliability
* Modular architecture for maintainability
