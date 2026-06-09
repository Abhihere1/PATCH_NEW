# Patch — Discount Tire IT Support Assistant

Patch is a self-service IT support chatbot for Discount Tire store associates. It uses a local knowledge base to ground an LLM (Ollama) and guides users through structured troubleshooting flows.

## Features

- **Authentication** — Secure login/signup with bcrypt-hashed passwords and JWT session cookies
- **Landing Page** — Centered hero with VDI category tile, KB availability badge, and pinned chat composer
- **Active Chat** — LLM-driven conversation with Markdown rendering, typing indicator, and incident state tracking
- **Dynamic Controls** — LLM can return option buttons, single-select lists, or structured multi-card forms
- **Escalation & Resolution** — Automatic status transitions with summary cards and feedback collection
- **Incident History** — Full list and detail pages with conversation replay and resume functionality
- **Knowledge Base** — Local Markdown files in `knowledge_base/workflows/` drive LLM responses; images served from `knowledge_base/images/`
- **Resume Chat** — Continue an open incident from the detail page; state restored including unanswered controls

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **MongoDB** (Mongoose) — Incident persistence
- **Ollama** (gemma4:31b-cloud or any OpenAI-compatible model)
- **Tailwind CSS v4**
- **react-markdown** — Markdown rendering in chat
- **bcryptjs** — Password hashing
- **jsonwebtoken** — Session management

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in your values:

```
MONGODB_URI=mongodb://localhost:27017/patch
JWT_SECRET=your-secret-key
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:31b-cloud
OLLAMA_API_KEY=
```

2. Install dependencies:

```bash
npm install
```

3. (Optional) Add KB content:

```
knowledge_base/
  workflows/
    vdi.md
  images/
    screenshot.png
```

4. Run in development:

```bash
npm run dev
```

5. Navigate to `http://localhost:3000/signup` to create an account, then start troubleshooting.

## Architecture

```
app/
  page.tsx                  # Main chat page (pre-chat + active-chat states)
  login/page.tsx
  signup/page.tsx
  incidents/page.tsx
  incidents/[id]/page.tsx
  api/auth/                 # login, signup, logout, me
  api/chat/                 # Core conversation endpoint
  api/incidents/            # CRUD + feedback + control
  api/kb/                   # KB status + image serving

components/
  Header.tsx
  MarkdownMessage.tsx
  DynamicControl.tsx
  FeedbackCard.tsx
  StatusSummaryCard.tsx

lib/
  mongodb.ts
  auth.ts
  kb.ts
  llm.ts
  models/User.ts
  models/Incident.ts
```

## Knowledge Base

Place `.md` files in `knowledge_base/workflows/`. The filename maps to a category slug (`vdi.md` → VDI tile). Images referenced as `![alt](filename.png)` must exist in `knowledge_base/images/`. The app never writes to this directory.
