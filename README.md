# RAG Chatbot Platform

A production-ready AI SaaS platform that lets users upload documents (PDFs, text, URLs) and chat with an AI that answers questions strictly based on their uploaded data using Retrieval-Augmented Generation (RAG).

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, NextAuth
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL via Supabase + pgvector for embeddings
- **AI**: OpenAI (text-embedding-3-small + GPT-4o)
- **Storage**: Cloudinary

## Project Structure

```
rag-chatbot-platform/
├── apps/
│   ├── frontend/          # Next.js app
│   │   ├── src/
│   │   │   ├── app/       # App Router pages
│   │   │   ├── components/
│   │   │   ├── lib/       # API client, auth, utils
│   │   │   ├── store/     # Zustand state
│   │   │   └── types/
│   │   └── prisma/        # NextAuth schema
│   └── backend/           # Express API
│       ├── src/
│       │   ├── controllers/
│       │   ├── services/  # RAG pipeline, document processing
│       │   ├── routes/
│       │   ├── middleware/
│       │   └── lib/       # OpenAI, Cloudinary, chunker
│       └── prisma/        # Main schema with pgvector
└── package.json           # Monorepo root
```

## Setup

### 1. Prerequisites

- Node.js 18+
- Supabase project with pgvector enabled
- OpenAI API key
- Cloudinary account
- Google OAuth credentials

### 2. Supabase Setup

In your Supabase SQL editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Environment Variables

**Backend** (`apps/backend/.env`):

```env
DATABASE_URL="postgresql://postgres.ravioppwjugbebztaqcn:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ravioppwjugbebztaqcn:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="your-secret-min-32-chars"
OPENROUTER_API_KEY="sk-or-..."
OPENROUTER_CHAT_MODEL="meta-llama/llama-3.3-70b-instruct:free"
OPENROUTER_EMBEDDING_MODEL="qwen/qwen3-embedding-0.6b"
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
FRONTEND_URL="http://localhost:3000"
PORT=4000
```

**Frontend** (`apps/frontend/.env.local`):

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="same-secret-as-backend"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
EMAIL_SERVER_HOST="smtp.resend.com"
EMAIL_SERVER_PORT="465"
EMAIL_SERVER_USER="resend"
EMAIL_SERVER_PASSWORD="re_..."
EMAIL_FROM="noreply@yourdomain.com"
DATABASE_URL="same-as-backend"
NEXT_PUBLIC_BACKEND_URL="http://localhost:4000"
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Database Setup

```bash
# Push backend schema (includes pgvector tables)
npm run db:push

# Create HNSW index for fast vector search
# Run apps/backend/prisma/migrations/init_pgvector.sql in Supabase SQL editor
```

### 6. Run Development Servers

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## API Endpoints

| Method | Path                        | Description                  |
| ------ | --------------------------- | ---------------------------- |
| POST   | `/api/documents/upload`     | Upload PDF/text file         |
| POST   | `/api/documents/upload-url` | Add URL for scraping         |
| GET    | `/api/documents`            | List user documents          |
| DELETE | `/api/documents/:id`        | Delete document              |
| POST   | `/api/chat`                 | Send message (SSE streaming) |
| GET    | `/api/chat`                 | List chats                   |
| GET    | `/api/chat/:id`             | Get chat with messages       |
| DELETE | `/api/chat/:id`             | Delete chat                  |
| GET    | `/api/settings`             | Get chatbot settings         |
| PUT    | `/api/settings`             | Update settings              |

## RAG Pipeline

1. User uploads document → stored in Cloudinary
2. Text extracted (PDF parsing / URL scraping)
3. Text split into 800-token chunks with 100-token overlap
4. Each chunk embedded via `qwen/qwen3-embedding-0.6b` (free, 1024 dims)
5. Embeddings stored in PostgreSQL with pgvector
6. On chat: question embedded → cosine similarity search → top 5 chunks retrieved
7. Chunks injected into `meta-llama/llama-3.3-70b-instruct:free` prompt → streamed response with source attribution

## Features

- Google OAuth + Magic Link email authentication
- PDF upload and URL scraping
- Streaming chat responses (SSE)
- Source attribution with page numbers
- Chat history with persistence
- Configurable chatbot name, tone, and system prompt
- Delete documents and chats
- HNSW vector index for fast similarity search
