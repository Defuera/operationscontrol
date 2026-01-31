# The Journey - Tech Stack & Architecture

## Overview

This document details the technical architecture, database design, API structure, and deployment strategy for The Journey productivity system.

---

## Technology Choices

### Frontend

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Next.js 14** | Framework | App Router, RSC, single deployment |
| **TypeScript** | Language | Type safety, better DX |
| **Tailwind CSS** | Styling | Utility-first, rapid development |
| **shadcn/ui** | Components | Accessible, customizable, no lock-in |
| **@dnd-kit** | Drag & Drop | Best React DnD library, accessible |

### Backend

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Next.js API Routes** | API | Unified deployment with frontend |
| **Server Actions** | Mutations | Type-safe, reduces boilerplate |
| **Drizzle ORM** | Database | Lightweight, type-safe, SQL-like |

### Database

| Environment | Database | Rationale |
|-------------|----------|-----------|
| **Local/MVP** | SQLite | Zero config, file-based, fast |
| **Production** | PostgreSQL | Scalable, Vercel-compatible |

Drizzle ORM supports both seamlessly with minimal code changes.

### AI Integration

| Technology | Purpose |
|------------|---------|
| **OpenAI API** | Journal analysis, task extraction (default provider) |
| **Provider Abstraction** | Swappable AI backends (OpenAI, Claude, local models) |
| **Structured Output** | JSON mode for reliable task creation |

### Deployment (Production)

| Service | Purpose |
|---------|---------|
| **Vercel** | Hosting (Next.js optimized) |
| **Neon** or **Supabase** | Managed PostgreSQL |
| **Clerk** | Authentication |

---

## Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        Vercel                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │                  Next.js App                     │   │
│  │  ┌──────────────┐  ┌──────────────────────────┐ │   │
│  │  │   Frontend   │  │     API Routes           │ │   │
│  │  │  (React/RSC) │  │   /api/tasks             │ │   │
│  │  │              │  │   /api/projects          │ │   │
│  │  │  - Kanban    │  │   /api/journal           │ │   │
│  │  │  - Projects  │  │   /api/ai/analyze        │ │   │
│  │  │  - Journal   │  │                          │ │   │
│  │  └──────────────┘  └──────────────────────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
│                           │                             │
│                           ▼                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Drizzle ORM                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
   ┌─────────────┐                    ┌─────────────┐
   │   SQLite    │                    │  PostgreSQL │
   │   (Local)   │                    │  (Neon)     │
   └─────────────┘                    └─────────────┘

          │
          ▼
   ┌─────────────┐
   │ AI Provider │
   │  (OpenAI)   │
   └─────────────┘
```

### Request Flow

1. **Read operations**: Server Components fetch data directly via Drizzle
2. **Write operations**: Server Actions or API routes mutate data
3. **AI operations**: API route calls AI provider, processes response, returns structured data

---

## Database Schema

### Drizzle Schema Definition

```typescript
// src/db/schema.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Tasks
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['backlog', 'todo', 'in_progress', 'done']
  }).notNull().default('backlog'),
  domain: text('domain', {
    enum: ['work', 'side', 'chores']
  }).notNull(),
  priority: integer('priority').notNull().default(0),
  scheduledFor: text('scheduled_for'), // ISO date string
  projectId: text('project_id').references(() => projects.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Projects
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', {
    enum: ['side_project', 'learning', 'life']
  }).notNull(),
  status: text('status', {
    enum: ['active', 'completed', 'archived']
  }).notNull().default('active'),
  goals: text('goals'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Task Links (many-to-many self-reference)
export const taskLinks = sqliteTable('task_links', {
  id: text('id').primaryKey(),
  taskAId: text('task_a_id').notNull().references(() => tasks.id),
  taskBId: text('task_b_id').notNull().references(() => tasks.id),
  linkType: text('link_type', {
    enum: ['blocks', 'related', 'subtask']
  }).notNull(),
  createdAt: text('created_at').notNull(),
});

// Journal Entries
export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  aiAnalysis: text('ai_analysis'),
  createdAt: text('created_at').notNull(),
});
```

### PostgreSQL Migration

For production, change imports:

```typescript
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
```

Use proper `timestamp` types instead of text for dates.

---

## AI Integration

### Provider Pattern

AI uses a provider abstraction (`src/lib/ai/`) for swappable backends:

| Provider | Model | Status |
|----------|-------|--------|
| OpenAI | gpt-4o | Default |
| Anthropic | claude-sonnet | Alternative |

Set via `AI_PROVIDER` env var (defaults to `openai`).

### Features

1. **Journal Analysis** - On-demand analysis of journal entries (see `docs/product.md`)
2. **AI Chat** - Global assistant with CRUD access (see `docs/ai_chat.md`)

---

## API Design

### Task Endpoints

```typescript
// GET /api/tasks
// Query params: status, domain, projectId, scheduledFor
// Returns: Task[]

// POST /api/tasks
// Body: { title, description?, domain, priority?, scheduledFor?, projectId? }
// Returns: Task

// PATCH /api/tasks/[id]
// Body: Partial<Task>
// Returns: Task

// DELETE /api/tasks/[id]
// Returns: { success: true }

// POST /api/tasks/[id]/link
// Body: { targetTaskId, linkType }
// Returns: TaskLink

// DELETE /api/tasks/[id]/link/[linkId]
// Returns: { success: true }
```

### Project Endpoints

```typescript
// GET /api/projects
// Query params: status, type
// Returns: Project[]

// GET /api/projects/[id]
// Returns: Project with linked tasks

// POST /api/projects
// Body: { name, description?, type, goals? }
// Returns: Project

// PATCH /api/projects/[id]
// Body: Partial<Project>
// Returns: Project

// DELETE /api/projects/[id]
// Returns: { success: true }
```

### Journal Endpoints

```typescript
// GET /api/journal
// Query params: limit, offset
// Returns: JournalEntry[]

// POST /api/journal
// Body: { content }
// Returns: JournalEntry

// POST /api/journal/[id]/analyze
// Returns: AnalysisResponse (see AI Provider Abstraction section)
```

---

## Server Actions

For mutations, prefer Server Actions over API routes:

```typescript
// src/actions/tasks.ts
'use server';

import { db } from '@/db';
import { tasks } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export async function createTask(data: CreateTaskInput) {
  const task = await db.insert(tasks).values({
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).returning();

  revalidatePath('/');
  return task[0];
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  await db.update(tasks)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id));

  revalidatePath('/');
}
```

---

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # Main kanban view
│   ├── projects/
│   │   ├── page.tsx          # Projects list
│   │   └── [id]/page.tsx     # Project detail
│   ├── journal/
│   │   └── page.tsx          # Journal view
│   └── api/
│       ├── tasks/
│       ├── projects/
│       ├── journal/
│       └── ai/
├── components/
│   ├── kanban/
│   │   ├── board.tsx
│   │   ├── column.tsx
│   │   ├── task-card.tsx
│   │   └── task-dialog.tsx
│   ├── projects/
│   ├── journal/
│   └── ui/                   # shadcn components
├── actions/
│   ├── tasks.ts
│   ├── projects.ts
│   └── journal.ts
├── db/
│   ├── index.ts              # Database connection
│   ├── schema.ts             # Drizzle schema
│   └── migrations/
├── lib/
│   ├── utils.ts
│   └── ai/
│       ├── index.ts          # Exports active provider
│       ├── types.ts          # AIProvider interface
│       ├── openai.ts         # OpenAI implementation
│       ├── claude.ts         # Claude implementation (optional)
│       └── prompts.ts        # Shared prompt templates
└── types/
    └── index.ts
```

---

## Authentication (Production)

### Clerk Integration

```typescript
// src/middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

```typescript
// Protected Server Action
import { auth } from '@clerk/nextjs/server';

export async function createTask(data: CreateTaskInput) {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');

  // ... rest of action
}
```

---

## Environment Variables

### Local Development

```bash
# .env.local
DATABASE_URL="file:./local.db"
OPENAI_API_KEY="sk-..."
# AI_PROVIDER="openai"  # optional, defaults to openai
```

### Production

```bash
# Vercel Environment Variables
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
AI_PROVIDER="openai"
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
```

---

## Deployment

### Vercel Configuration

```json
// vercel.json (optional, for custom settings)
{
  "buildCommand": "npm run build",
  "framework": "nextjs"
}
```

### Database Migrations

```bash
# Generate migration
npx drizzle-kit generate:sqlite

# Push to database
npx drizzle-kit push:sqlite

# For production (PostgreSQL)
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

---

## Telegram Bot (Future)

### Architecture

```
┌──────────────┐     Webhook     ┌─────────────────────┐
│   Telegram   │ ───────────────▶│  Vercel Function    │
│   Servers    │                 │  /api/telegram      │
└──────────────┘                 └─────────────────────┘
                                          │
                                          ▼
                                 ┌─────────────────────┐
                                 │   Shared Database   │
                                 │   (Same as app)     │
                                 └─────────────────────┘
```

### Implementation

```typescript
// src/app/api/telegram/route.ts
import { Bot, webhookCallback } from 'grammy';
import { db } from '@/db';
import { tasks } from '@/db/schema';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.command('add', async (ctx) => {
  const taskTitle = ctx.match;
  if (!taskTitle) {
    return ctx.reply('Usage: /add <task title>');
  }

  await db.insert(tasks).values({
    id: crypto.randomUUID(),
    title: taskTitle,
    domain: 'chores', // default domain
    status: 'backlog',
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await ctx.reply(`Task added: ${taskTitle}`);
});

bot.command('today', async (ctx) => {
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = await db.select()
    .from(tasks)
    .where(eq(tasks.scheduledFor, today));

  if (todayTasks.length === 0) {
    return ctx.reply('No tasks scheduled for today!');
  }

  const list = todayTasks
    .map(t => `• ${t.title} [${t.status}]`)
    .join('\n');

  await ctx.reply(`Today's tasks:\n${list}`);
});

export const POST = webhookCallback(bot, 'std/http');
```

---

## Performance Considerations

### Optimistic Updates

For drag-and-drop, update UI immediately:

```typescript
// Use React state for immediate feedback
const [tasks, setTasks] = useState(initialTasks);

async function handleDrop(taskId: string, newStatus: Status) {
  // Optimistic update
  setTasks(prev =>
    prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
  );

  // Persist to server
  try {
    await updateTaskStatus(taskId, newStatus);
  } catch (error) {
    // Revert on failure
    setTasks(initialTasks);
    toast.error('Failed to update task');
  }
}
```

### Caching

Use Next.js caching for read-heavy operations:

```typescript
// Cached database query
import { unstable_cache } from 'next/cache';

export const getTasks = unstable_cache(
  async () => db.select().from(tasks),
  ['tasks'],
  { revalidate: 60 } // Revalidate every 60 seconds
);
```

---

## Security Considerations

### Input Validation

```typescript
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  domain: z.enum(['work', 'side', 'chores']),
  priority: z.number().min(0).max(4).optional(),
  scheduledFor: z.string().datetime().optional(),
  projectId: z.string().uuid().optional(),
});

export async function createTask(input: unknown) {
  const data = createTaskSchema.parse(input);
  // ... proceed with validated data
}
```

### Rate Limiting

For AI analysis endpoint:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 analyses per hour
});
```
