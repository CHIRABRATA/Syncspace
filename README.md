# SyncSpace — Distributed Real-Time Collaborative Document Editor

SyncSpace is a production-grade, real-time collaborative document editor backend built with Node.js, Express, WebSockets, and PostgreSQL (hosted on Supabase). Designed to mimic core real-time collaboration engines like Google Docs and Figma, SyncSpace handles authenticated REST workflows, connection pooling, full-duplex WebSocket streaming, and document room isolation.

---

## 🛠 Tech Stack

* **Runtime & Framework**: Node.js (v22+), Express.js
* **Database**: PostgreSQL (Supabase) with standard `pg` connection pooling
* **Real-Time Communication**: Raw WebSockets (`ws`)
* **Authentication**: JWTs managed via `httpOnly` secure cookies
* **Security & Auth**: `bcrypt` password hashing, Role-Based Access Control (RBAC) middleware

---

## 🏗 System Architecture & Key Design Decisions

### 1. WebSockets over Short/Long Polling & SSE
Traditional HTTP/REST requests follow a client-driven pull model. For real-time document editing, polling incurs extreme HTTP header overhead (~1KB per request) and high database load. WebSockets provide a low-latency, full-duplex TCP pipeline with lightweight frame headers (~2–6 bytes), allowing instant server-to-client push updates.

### 2. State Isolation via WebSocket Document Rooms
To avoid broadcasting edit updates to unrelated users, the backend implements an in-memory Room Manager (`Map<documentId, Set<WebSocket>>`). Edits made on Document A are strictly broadcast only to socket connections subscribed to Document A's room.

### 3. Dual-Layer Storage Strategy
* **Cold Storage / Source of Truth**: PostgreSQL persists document metadata, ownership, user accounts, and permissions.
* **Ephemeral Memory**: Active WebSocket connections and room subscriptions exist in backend process memory to process keystrokes at sub-millisecond latencies.

### 4. Connection Pooling (`pg`)
Node's single-threaded event loop borrows connections from a pre-allocated pool (up to 20 connections) rather than spawning fresh TCP connections per request, keeping DB response times under 2ms.

---

## 🗄 Database Schema

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT DEFAULT '',
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Permissions (RBAC)
CREATE TYPE role_type AS ENUM ('READ', 'WRITE');

CREATE TABLE document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role role_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, user_id)
);

-- Composite Index for Fast RBAC Queries
CREATE INDEX idx_doc_perm_user_doc ON document_permissions(user_id, document_id);