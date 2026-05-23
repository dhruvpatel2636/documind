# DocuMind — Frontend

Next.js 16 app for **DocuMind**, an AI-powered RAG (Retrieval-Augmented Generation) chatbot platform that lets users chat with their uploaded documents.

> 🔗 **Backend repo:** [documind-backend](https://github.com/dhruvpatel2636/documind-backend)

---

## ✨ Features

- 🔐 **Authentication** — Google OAuth + Magic Link (NextAuth)
- 📄 **Document upload** — Drag-and-drop PDFs, text files, or paste URLs
- 💬 **Real-time streaming chat** — SSE streaming with markdown rendering
- 🎯 **Document filtering** — Scope questions to specific documents via filter chips
- 📚 **Source attribution** — Every answer cites the source document + page + similarity %
- 🌗 **Dark mode** — Respects system preference, manual override
- ♿ **Accessible** — ARIA live regions, proper touch targets, keyboard navigation
- ⚙️ **Customizable** — Per-user chatbot name, tone, system prompt

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 16** (App Router, Turbopack) |
| Runtime | **React 19** |
| Language | **TypeScript 5.8** |
| Styling | **Tailwind CSS 4** (CSS-first config) |
| UI Components | **shadcn/ui** + **Radix UI** primitives |
| State | **Zustand 5** |
| Auth | **NextAuth v4** + PrismaAdapter |
| ORM | **Prisma 7** (NextAuth tables only) |
| Theming | **next-themes** |
| Markdown | **react-markdown** + remark-gfm |
| File upload | **react-dropzone** |

## 📁 Structure

```
src/
├── app/                    # App Router pages
│   ├── auth/               # Sign-in / error pages
│   ├── dashboard/          # Authenticated app shell
│   │   ├── chat/           # Chat interface
│   │   ├── knowledge-base/ # Document management
│   │   └── settings/       # Chatbot settings
│   ├── api/auth/           # NextAuth + JWT bridge endpoints
│   └── providers.tsx       # Session + Theme providers
├── components/
│   ├── chat/               # ChatWindow, MessageBubble, ChatInput, ChatHistory
│   ├── documents/          # DocumentUpload, DocumentList
│   ├── layout/             # Sidebar
│   └── ui/                 # shadcn primitives (Button, Card, AlertDialog…)
├── lib/                    # API client, auth config, utils
├── store/                  # Zustand chat store
└── types/                  # Shared TypeScript types
```

## 🚀 Setup

### Prerequisites

- Node.js 20+
- The [backend](https://github.com/dhruvpatel2636/documind-backend) running on `http://localhost:4000`
- A Supabase project (shared with backend) for NextAuth session storage
- Google OAuth credentials
- (Optional) An SMTP provider for Magic Link emails (Resend recommended)

### 1. Install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="must-match-backend-secret-min-32-chars"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
EMAIL_SERVER_HOST="smtp.resend.com"
EMAIL_SERVER_PORT="465"
EMAIL_SERVER_USER="resend"
EMAIL_SERVER_PASSWORD="re_..."
EMAIL_FROM="noreply@yourdomain.com"
DATABASE_URL="postgresql://...supabase..."
NEXT_PUBLIC_BACKEND_URL="http://localhost:4000"
```

### 3. Generate Prisma client (NextAuth tables)

```bash
npm run db:generate
```

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

## 🔌 How It Talks to the Backend

The frontend uses a **session-to-JWT bridge**:

1. NextAuth stores the user session in PostgreSQL.
2. When making API calls, the frontend calls `/api/auth/token` to mint a short-lived JWT signed with `NEXTAUTH_SECRET`.
3. The JWT is sent as `Authorization: Bearer <token>` to the Express backend.
4. The backend validates the JWT using the same secret.

This keeps the backend stateless while still tying every request to a real user.

## 📜 License

MIT
