<div align="center">

# RAG Microservice

**A Distributed Document Q&A System** — upload a PDF and the pipeline parses, chunks, embeds and indexes it, so you can chat with it through a retrieval-augmented generation (RAG) agent backed by a local Ollama LLM.

`NestJS` · `FastAPI` · `Apache Kafka` · `PostgreSQL + Drizzle ORM` · `ChromaDB` · `Ollama` · `pnpm` · `uv`

</div>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Kafka Topics](#kafka-topics)
- [Data Stores](#data-stores)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Scripts](#scripts)
- [Testing & Linting](#testing--linting)
- [Notes & Known Limitations](#notes--known-limitations)

---

## Overview

The system turns static PDFs into an ask-able knowledge base:

1. **Authenticate** — a user registers / logs in and receives a JWT (`auth-service`).
2. **Upload** — the user uploads a PDF. `document-service` persists the metadata, stores the file and publishes `document.created`.
3. **Parse & embed** — `document-parser-service` loads the PDF, splits it into overlapping chunks and embeds them into a per-document **ChromaDB** collection.
4. **Index** — `knowledge-vector-service` records the document as knowledge, emits `knowledge.ready` and exposes a synchronous semantic-search API.
5. **Ask** — the user starts a conversation against a `READY` document. `conversation-service` stores the user message and publishes `message.created`.
6. **Answer** — `agent-service` consumes the message, retrieves the top-k relevant chunks over HTTP, builds a grounded prompt, calls **Ollama** and publishes `response.generated`.
7. **Persist** — `conversation-service` consumes `response.generated` and stores the assistant reply, which the client can then fetch.

The result is an asynchronous, event-driven ingestion pipeline plus a synchronous RAG query path.

---

## Architecture

### Service map

| Service | Tech | Port | Role |
| --- | --- | --- | --- |
| `api-gateway` | NestJS | `3000` | Single public HTTP entrypoint. Verifies JWTs and proxies to downstream services over HTTP using an `x-user-id` header. |
| `auth-service` | NestJS + Drizzle | `3001` | Registration, bcrypt password hashing, JWT issuing, publishes `user.registered` / `user.logged_in`. |
| `user-service` | NestJS + Drizzle | `3002` | User profiles. Consumes `user.registered` to create the profile, exposes read/update. |
| `document-service` | NestJS + Drizzle | `3003` | Document metadata + PDF storage. Publishes `document.created`, consumes `document.parsed` and `knowledge.ready` to track status. |
| `conversation-service` | NestJS + Drizzle | `3004` | Conversations and messages. Publishes `conversation.created` / `message.created`, consumes `response.generated`. |
| `document-parser-service` | FastAPI + LangChain | `8001`\* | Consumes `document.created`, extracts PDF text, chunks and embeds into Chroma, publishes `document.parsed`. |
| `knowledge-vector-service` | FastAPI + LangChain | `8002`\* | Consumes `document.parsed` / `document.deleted`, registers knowledge, publishes `knowledge.ready`, serves `POST /api/v1/search`. |
| `agent-service` | FastAPI | `8003`\* | Consumes `message.created`, performs RAG retrieval + Ollama generation, publishes `response.generated`. |

\* FastAPI apps receive their port from the `uvicorn --port` flag; the values above follow the convention used in this repository. `agent-service` expects `knowledge-vector-service` at `http://localhost:8002` by default.

### Request / event flow


![Service event flow diagram](assets/doc-qna.png)

---

## Tech Stack

**JavaScript / TypeScript (NestJS monorepo)**

- [NestJS 11](https://nestjs.com) — REST + Kafka hybrid microservices (`@nestjs/microservices`, `kafkajs`)
- [Drizzle ORM](https://orm.drizzle.team) + `pg` — schema definitions and `drizzle-kit push` migrations against PostgreSQL
- [Passport JWT](https://docs.nestjs.com/security/authentication) — bearer-token verification in the gateway and services
- `class-validator` / `class-transformer` — DTO validation behind a global `ValidationPipe`
- `bcrypt` — password hashing
- `multer` — PDF upload handling (memory storage in the gateway, disk storage in `document-service`)

**Python (FastAPI)**

- [FastAPI](https://fastapi.tiangolo.com) + `uvicorn` — HTTP APIs and service lifespans
- `aiokafka` — async Kafka producers / consumers
- `pydantic-settings` — per-service configuration loaded from `.env`
- `loguru` — logging
- [LangChain](https://python.langchain.com) (`langchain-chroma`, `langchain-ollama`, `pypdf`) — PDF loading, chunking, embeddings and retrieval
- `SQLModel` + `asyncpg` — async PostgreSQL access

**Infrastructure**

- **Apache Kafka** (+ Zookeeper, Kafka UI) — the event backbone
- **PostgreSQL 16** — one instance, one database per NestJS service
- **ChromaDB** — a persisted vector store on disk (`./vector_store`)
- **Ollama** — local LLM (`qwen2.5:7b`) and embedding model (`qwen3-embedding:0.6b`)

---

## Repository Layout

```
rag-microservice/
├── apps/
│   ├── api-gateway/                  # NestJS — public HTTP entrypoint, JWT guard, HTTP proxying
│   ├── auth-service/                 # NestJS — register/login, JWT issuing, user.registered producer
│   ├── user-service/                 # NestJS — user profiles, user.registered consumer
│   ├── document-service/             # NestJS — document metadata + PDF storage (hybrid Kafka app)
│   ├── conversation-service/         # NestJS — conversations & messages (hybrid Kafka app)
│   ├── document-parser-service/      # FastAPI — PDF -> chunks -> Chroma embeddings
│   ├── knowledge-vector-service/     # FastAPI — knowledge registry + semantic search API
│   └── agent-service/                # FastAPI — RAG agent (retrieval + Ollama generation)
├── libs/
│   ├── common/                       # Shared JWT strategy, upload interceptor, service constants, event envelope
│   └── kafka/                        # KafkaModule.register(groupId) + KAFKA_TOPICS + broker constants
├── docker-compose.yaml               # Kafka, Zookeeper, Kafka UI, PostgreSQL
├── init-db.sh                        # Drops & recreates one Postgres database per service
├── push_migration.sh                 # Runs drizzle-kit push for every NestJS service
├── nest-cli.json                     # NestJS monorepo project map
├── package.json / tsconfig.json      # pnpm workspace root for the NestJS apps
└── .env                             # Local database URLs (git-ignored)

uploads/documents/                    # Stored PDFs (shared by the gateway, document-service and parser)
vector_store/                         # ChromaDB persistence directory (created at runtime)
```

Each NestJS app follows the same internal shape:

```
apps/<service>/
├── src/
│   ├── main.ts                       # Bootstrap (ValidationPipe + Kafka microservice when hybrid)
│   ├── <service>.module.ts
│   ├── <service>.controller.ts       # HTTP routes + @EventPattern Kafka handlers
│   ├── <service>.service.ts
│   ├── database/                     # Drizzle schema.ts + database client/module
│   ├── dto/                          # class-validator DTOs
│   └── interface/                    # Kafka event payload types
└── drizzle.config.ts                 # Points drizzle-kit at that service's database
```

Each FastAPI app follows the same internal shape:

```
apps/<service>/
├── app/
│   ├── main.py                       # FastAPI app + lifespan (start/stop Kafka, DB init)
│   ├── core/config.py                # pydantic-settings Settings
│   ├── kafka/                        # topics.py, consumer.py, producer.py
│   ├── db/                           # SQLModel models + async session
│   ├── schemas/                      # Pydantic request/response & event models
│   └── services/ or agent/           # Business logic
├── pyproject.toml                    # uv-managed dependencies
└── uv.lock
```

---

## Kafka Topics

Every event shares one envelope (see `libs/common/src/interface/kafka-event.interface.ts`):

```json
{
  "eventId": "uuid",
  "eventType": "document.created",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "version": 1,
  "data": {}
}
```

| Topic | Producer | Consumer(s) | Purpose |
| --- | --- | --- | --- |
| `user.registered` | `auth-service` | `user-service` | Create the user profile row after registration |
| `user.logged_in` | `auth-service` | — | Login audit signal (reserved for a future stats service) |
| `document.created` | `document-service` | `document-parser-service` | A PDF was uploaded and is ready to parse |
| `document.parsed` | `document-parser-service` | `document-service`, `knowledge-vector-service` | Parsing finished (or failed) and chunks were embedded |
| `knowledge.ready` | `knowledge-vector-service` | `document-service` | The document is indexed and retrievable |
| `conversation.created` | `conversation-service` | — | A new conversation was opened (reserved for a future stats service) |
| `message.created` | `conversation-service` | `agent-service` | A user message needs an answer |
| `response.generated` | `agent-service` | `conversation-service` | The assistant reply (or failure) is ready to persist |
| `document.deleted` | *(not implemented yet)* | `knowledge-vector-service` | Delete a document's Chroma collection and mark its knowledge inactive |

`KAFKA_TOPICS` in `libs/kafka/src/constants/kafka.constants.ts` is the single source of truth on the TypeScript side. Each Python service declares the same names in its own `app/kafka/topics.py`, driven by `app/core/config.py`.

---

## Data Stores

### PostgreSQL databases

`init-db.sh` drops and recreates these databases inside the single `postgres` container:

| Database | Owner service | Tables |
| --- | --- | --- |
| `auth_db` | `auth-service` | `auth_user` |
| `user_db` | `user-service` | `users` |
| `document_db` | `document-service` | `documents` |
| `conversation_db` | `conversation-service` | `conversations`, `messages` |
| `stats_db` | *(reserved)* | — |
| `knowledge_db` | `knowledge-vector-service` | `knowledge_documents` (created by SQLModel on startup) |

NestJS tables are created with `drizzle-kit push` (see `push_migration.sh`); FastAPI tables are created with `SQLModel.metadata.create_all` during startup.

### Vector store

- ChromaDB persists to `./vector_store`, with one collection per document named `doc_<documentId>`.
- `document-parser-service` writes the chunks; `knowledge-vector-service` reads them for search and deletes collections on `document.deleted`.
- The embedding model must be identical in both services (`qwen3-embedding:0.6b`), otherwise the stored vectors and query vectors will not match.

### File storage

Uploaded PDFs are written to `./uploads/documents` (PDF only, max 10 MB) and the absolute path is passed through `document.created` so the parser can read the same file from disk.

---

## Getting Started

### Prerequisites

| Tool | Notes |
| --- | --- |
| Node.js 20+ and [pnpm](https://pnpm.io) | NestJS apps |
| [uv](https://docs.astral.sh/uv/) and Python 3.14 | FastAPI apps |
| Docker + Docker Compose | Kafka, Zookeeper, Kafka UI, PostgreSQL |
| [Ollama](https://ollama.com) | Local LLM and embedding models |

### 1. Install dependencies

```bash
# JavaScript / TypeScript (repository root)
pnpm install

# Python (run inside each service directory)
cd apps/document-parser-service && uv sync
cd apps/knowledge-vector-service && uv sync
cd apps/agent-service && uv sync
```

### 2. Start the infrastructure

```bash
docker compose up -d
```

| Endpoint | URL |
| --- | --- |
| Kafka broker (from the host) | `localhost:9093` |
| Kafka (inside the Docker network) | `kafka:29092` |
| Kafka UI | http://localhost:8080 |
| PostgreSQL | `localhost:5432` — user `aiknowledgebaseapp`, password `aiknowledgebase_password` |

### 3. Create the databases

```bash
sudo docker exec -i aiknowledgebaseapp-postgres sh < init-db.sh
```

### 4. Configure the environment

Create a `.env` file at the repository root (it is git-ignored). The NestJS services, their Drizzle configs and the FastAPI defaults all read from it:

```dotenv
# NestJS services (Drizzle)
AUTH_SERVICE_DATABASE_URL='postgresql://aiknowledgebaseapp:aiknowledgebase_password@localhost:5432/auth_db?schema=public'
USER_SERVICE_DATABASE_URL='postgresql://aiknowledgebaseapp:aiknowledgebase_password@localhost:5432/user_db?schema=public'
DOCUMENT_SERVICE_DATABASE_URL='postgresql://aiknowledgebaseapp:aiknowledgebase_password@localhost:5432/document_db?schema=public'
CONVERSATION_SERVICE_DATABASE_URL='postgresql://aiknowledgebaseapp:aiknowledgebase_password@localhost:5432/conversation_db?schema=public'

# Shared
JWT_SECRET='change-me'
KAFKA_BROKER='localhost:9093'
```

The FastAPI services fall back to the same credentials through the defaults in their `app/core/config.py` (`knowledge_db`, `agent_db`, `localhost:9093`, `http://localhost:11434`). Override them with a per-service `.env` file when needed.

### 5. Push the database schemas

```bash
./push_migration.sh
```

### 6. Pull the Ollama models

```bash
ollama pull qwen3-embedding:0.6b   # embeddings (parser + knowledge services)
ollama pull qwen2.5:7b             # generation (agent service)
```

### 7. Run the services

**NestJS** — from the repository root:

```bash
pnpm start:dev api-gateway                            # api-gateway, auht-service ... (default Nest project) on :3000

npx nest start auth-service --watch
npx nest start user-service --watch
npx nest start document-service --watch
npx nest start conversation-service --watch
```

**FastAPI** — from each service directory:

```bash
cd apps/document-parser-service  && uv run uvicorn app.main:app --reload --port 8001
cd apps/knowledge-vector-service && uv run uvicorn app.main:app --reload --port 8002
cd apps/agent-service            && uv run uvicorn app.main:app --reload --port 8003
```

---

## API Reference

### API Gateway (`http://localhost:3000`)

| Method | Endpoint | Auth | Body / Params | Description |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | — | `{ email, password }` | Create an account (password ≥ 6 characters) |
| `POST` | `/auth/login` | — | `{ email, password }` | Returns `{ access_token, user }` |
| `GET` | `/user/profile` | JWT | — | Current user profile |
| `PUT` | `/user/profile` | JWT | `{ firstName?, lastName? }` | Update the current user profile |
| `POST` | `/document/upload` | JWT | `multipart/form-data` field `file` (PDF ≤ 10 MB) | Upload a PDF and start ingestion |
| `GET` | `/document` | JWT | — | List the caller's documents with their status |
| `GET` | `/document/:id` | JWT | — | Fetch a single document |
| `POST` | `/conversation` | JWT | `{ documentId, content }` | Start (or reuse) a conversation for a `READY` document and send the first question |
| `POST` | `/conversation/:conversationId` | JWT | `{ content }` | Send another question in the conversation |
| `GET` | `/conversation` | JWT | — | List the caller's conversations |
| `GET` | `/conversation/:conversationId` | JWT | — | A conversation with its messages |

Send the token as `Authorization: Bearer <access_token>`.

**Document status lifecycle:** `PENDING` → `PROCESSING` → `COMPLETED` → `READY`, or `FAILED`. A conversation can only be started once the document is `READY`.

### Direct service endpoints

| Service | Method | Endpoint | Description |
| --- | --- | --- | --- |
| `auth-service` | `POST` | `/v1/auth/register`, `/v1/auth/login` | Same contract as through the gateway |
| `user-service` | `GET` / `PUT` | `/v1/user/profile` | Requires an `x-user-id` header |
| `document-service` | `POST` | `/v1/document/upload` | Requires an `x-user-id` header |
| `document-service` | `GET` | `/v1/document`, `/v1/document/:id` | Requires an `x-user-id` header |
| `conversation-service` | `POST` | `/v1/conversation`, `/v1/conversation/:conversationId` | Requires an `x-user-id` header |
| `conversation-service` | `GET` | `/v1/conversation`, `/v1/conversation/:conversationId` | Requires an `x-user-id` header |
| `knowledge-vector-service` | `POST` | `/api/v1/search` | `{ userId, query, documentId?, topK? }` → ranked chunks |
| `agent-service` | `POST` | `/api/v1/query` | `{ userId, query, documentId? }` → generated answer |
| FastAPI services | `GET` | `/health` | Liveness probe |

### Example: register, upload, ask

```bash
# 1. Register and log in
curl -s -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"secret123"}'

TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"secret123"}' | jq -r .access_token)

# 2. Upload a PDF
DOC_ID=$(curl -s -X POST http://localhost:3000/document/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@./guide.pdf' | jq -r .document.id)

# 3. Wait until GET /document/$DOC_ID reports status "READY", then start a conversation
curl -s -X POST http://localhost:3000/conversation \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"documentId\":\"$DOC_ID\",\"content\":\"What is this document about?\"}" | jq

# 4. Poll the conversation to read the assistant's answer
curl -s http://localhost:3000/conversation/$CONVERSATION_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Scripts

| Script | Description |
| --- | --- |
| `pnpm start:dev` | Run `api-gateway` (the default Nest project) in watch mode |
| `pnpm build` | Build the NestJS project |
| `./push_migration.sh` | `drizzle-kit push` for every NestJS service |
| `./init-db.sh` | Drop and recreate all PostgreSQL databases (executed inside the Postgres container) |

---


## Notes & Known Limitations

- **The Kafka path is the primary flow for the agent.** `POST /api/v1/query` on `agent-service` is a synchronous shortcut useful for debugging; in normal operation the agent reacts to `message.created` and answers through `response.generated`.
- **`agent_db` is not created by `init-db.sh`.** `agent-service` defaults to `postgresql+asyncpg://…@localhost:5432/agent_db`, so create that database manually (or add it to `init-db.sh`) before starting the service.
- **`document.deleted` has a consumer but no producer.** `knowledge-vector-service` can clean up a Chroma collection and mark knowledge inactive, but no service publishes the topic yet.
- **A `stats-service` is planned.** `user.logged_in` and `conversation.created` are emitted but nothing consumes them, and `stats_db` is created but unused.
- **FastAPI ports are a convention**, not hard-coded values — they come from the `uvicorn --port` flag. Only `knowledge-vector-service`'s address (`http://localhost:8002`) is referenced in `agent-service` config.
- **Single-host assumptions.** Service URLs, the Kafka broker address (`localhost:9093`) and the shared `uploads/` + `vector_store/` directories all assume every service runs on one machine; there is no service discovery or shared object storage yet.
- **No global prefix on the gateway.** It mirrors the downstream route names (`/auth`, `/user`, `/document`, `/conversation`) while the services themselves are versioned under `/v1`.
- **`auth-service` publishes the `USER_REGISTERED` event type on login** while emitting to the `user.logged_in` topic — a small inconsistency worth aligning as the event contracts evolve.

---

## Future Work & Improvements

- **Circuit breaker for the agent → knowledge-vector-service call.** `agent-service`'s synchronous HTTP search request has no failure isolation today — if `knowledge-vector-service` is down or slow, every in-flight `message.created` event just times out one by one. A circuit breaker (e.g. via `pybreaker` or a hand-rolled state machine) would fail fast once the downstream service is clearly unhealthy and let `agent-service` publish a `FAILED` `response.generated` immediately instead of holding the consumer loop hostage.
- **Saga pattern for document deletion.** Deleting a document currently has no coordinated cleanup path — `document-service`, `document-parser-service`'s stored chunks, and `knowledge-vector-service`'s Chroma collection would each need to react independently, with no rollback if one step fails partway through. An orchestrated or choreography-based saga (`document.delete.requested` → per-service completion/compensation events) would keep the document's state consistent across services instead of leaving orphaned vectors or a document stuck mid-delete.
- **Dead-letter queue for Kafka consumers.** Consumers currently log and drop messages that fail validation or processing (see the `except Exception` catch-alls). A DLQ topic per service would let failed events be inspected and reprocessed instead of silently disappearing.
- **Retry with backoff on the agent's HTTP calls.** Both the knowledge-service search call and the Ollama generation call fail on the first error today. Wrapping them in a retry policy (e.g. `tenacity`) with exponential backoff would smooth over transient failures before falling back to a `FAILED` event.
- **Distributed tracing / correlation IDs.** Each event carries its own `eventId`, but there's no shared trace ID threading a single user request through the gateway → conversation-service → agent-service → knowledge-vector-service chain, which makes debugging a slow or failed response across services harder than it needs to be.
- **Real-time delivery to the client.** The client currently has no way to know when `response.generated` lands except polling `GET /conversation/:id`. A WebSocket or SSE channel from `conversation-service` (or the gateway) would push the assistant's reply the moment it's persisted.
- **Service discovery instead of hardcoded URLs.** Every service address (`knowledge-vector-service` at `localhost:8002`, the Kafka broker, etc.) is a hardcoded default today, which only works because everything runs on one host. A registry (Consul, or even just environment-driven config per deployment) would be a prerequisite for running this across multiple machines.
- **Test coverage for the Python services.** The NestJS apps have Jest specs; `document-parser-service`, `knowledge-vector-service`, and `agent-service` don't have tests yet — particularly worth covering the idempotency check in `agent-service`'s consumer and the retrieval/prompt-building logic in isolation from the LLM call.

---

Built with NestJS, FastAPI, Apache Kafka, PostgreSQL, ChromaDB and Ollama.

