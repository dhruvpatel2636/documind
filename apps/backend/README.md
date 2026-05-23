# DocuMind — Backend

Express 5 API for **DocuMind**, an AI-powered RAG (Retrieval-Augmented Generation) chatbot platform. Handles document ingestion, embedding generation, vector similarity search, and streaming AI responses.

> 🔗 **Frontend repo:** [documind-frontend](https://github.com/dhruvpatel2636/documind-frontend)

---

## ✨ What It Does

- 📥 **Document ingestion** — Parses PDFs (`pdf-parse`), scrapes URLs (`cheerio`), accepts plain text
- ✂️ **Smart chunking** — Splits text into 800-token chunks with 100-token overlap
- 🧠 **Embedding generation** — Calls OpenRouter to embed each chunk (Qwen 1024-dim)
- 🔍 **Vector search** — Cosine similarity via pgvector with HNSW index
- 💬 **Streaming RAG chat** — SSE streaming of LLM responses with cited sources
- 🔐 **JWT auth** — Stateless verification of tokens minted by the Next.js frontend
- 🛡️ **Rate limiting** — 20 chat requests/min, 100 API requests/15min per IP
- 📊 **Observability** — Winston logger + morgan HTTP logs

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | **Node.js 20+** |
| Framework | **Express 5** |
| Language | **TypeScript 5.8** |
| ORM | **Prisma 7** with `@prisma/adapter-pg` |
| Database | **PostgreSQL** (Supabase) + **pgvector** extension |
| AI | **OpenAI SDK v6** (configured for OpenRouter) |
| LLM | `meta-llama/llama-3.3-70b-instruct:free` (default) |
| Embeddings | `qwen/qwen3-embedding-0.6b` (1024 dims, free) |
| File storage | **Cloudinary** |
| PDF parsing | **pdf-parse** |
| Validation | **Zod** |
| Auth | **JWT** (Bearer token from frontend) |
| Security | **helmet** + **express-rate-limit** |

## 📁 Structure

```
src/
├── controllers/      # Route handlers (chat, documents, settings)
├── services/         # Business logic
│   ├── documentService.ts   # Upload → parse → chunk → embed → store
│   └── ragService.ts        # Vector search + LLM streaming
├── routes/           # Express route definitions
├── middleware/       # JWT auth, error handler
├── lib/              # OpenAI/Cloudinary clients, chunker, logger, Prisma
├── types/            # Shared TS types
└── index.ts          # Server entry

prisma/
├── schema.prisma     # Full schema (User, Document, Chunk, Chat, Message, Settings)
└── migrations/
    └── init_pgvector.sql   # Run once in Supabase SQL editor for HNSW index
```

## 🚀 Setup

### Prerequisites

- Node.js 20+
- A Supabase project with `pgvector` extension enabled:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- OpenRouter API key (free tier works)
- Cloudinary account

### 1. Install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL="postgresql://postgres.xxx:[PASS]@aws-1-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:[PASS]@aws-1-region.pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="must-match-frontend-secret-min-32-chars"
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_CHAT_MODEL="meta-llama/llama-3.3-70b-instruct:free"
OPENROUTER_EMBEDDING_MODEL="qwen/qwen3-embedding-0.6b"
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
FRONTEND_URL="http://localhost:3000"
PORT=4000
```

### 3. Push schema + create HNSW index

```bash
npm run db:push
```

Then run `prisma/migrations/init_pgvector.sql` in the Supabase SQL editor.

### 4. Run

```bash
npm run dev          # tsx watch
# or
npm run build && npm start
```

API will be on `http://localhost:4000`.

## 🔗 API

| Method | Path                          | Description                  |
|--------|-------------------------------|------------------------------|
| GET    | `/health`                     | Health check                 |
| POST   | `/api/documents/upload`       | Upload PDF/text file         |
| POST   | `/api/documents/upload-url`   | Scrape & ingest URL          |
| GET    | `/api/documents`              | List user's documents        |
| GET    | `/api/documents/:id`          | Get document status          |
| DELETE | `/api/documents/:id`          | Delete document + chunks     |
| POST   | `/api/chat`                   | Send message (SSE streaming) |
| GET    | `/api/chat`                   | List user's chats            |
| GET    | `/api/chat/:id`               | Get chat with messages       |
| DELETE | `/api/chat/:id`               | Delete chat                  |
| GET    | `/api/settings`               | Get chatbot settings         |
| PUT    | `/api/settings`               | Update chatbot settings      |

All `/api/*` routes require `Authorization: Bearer <jwt>` minted by the frontend.

## 🧠 The RAG Pipeline

```
Upload                          Chat
  │                               │
  ▼                               ▼
Cloudinary               Embed question
  │                               │
  ▼                               ▼
Extract text             pgvector cosine search
  │                       (top 5 chunks, threshold 0.3)
  ▼                               │
Chunk (800 tok, 100 overlap)      ▼
  │                       Build prompt:
  ▼                       sys + history + context + Q
Embed (Qwen, 1024 dims)           │
  │                               ▼
  ▼                       OpenRouter Llama 3.3
Store in pgvector                 │
+ HNSW index                      ▼
                          SSE stream → frontend
                                  │
                                  ▼
                          Save assistant msg
                          + source attribution
```

## 📜 License

MIT
