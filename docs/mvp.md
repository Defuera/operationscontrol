# The Journey - MVP Specification

## Overview

This document defines the Minimum Viable Product (MVP) for The Journey. The MVP is a **local-first, single-user** application focused on core task management and journaling with AI assistance.

---

## MVP Goals

1. **Replace Linear** - Migrate existing workflow to custom system
2. **Validate core features** - Test kanban, projects, and journal before investing in production infrastructure
3. **Enable AI experimentation** - Iterate on journal analysis without scaling concerns
4. **Zero operational overhead** - No servers to manage, no databases to maintain

---

## Scope

### Included in MVP

| Feature | Details |
|---------|---------|
| **Kanban Board** | Full implementation with day/week/quarter views |
| **Task CRUD** | Create, read, update, delete tasks |
| **Task Linking** | Flexible links between tasks |
| **Domain Filtering** | Filter by work/side/chores |
| **Projects** | Full CRUD, link tasks to projects |
| **Journal** | Freeform entries with timestamps |
| **AI Analysis** | On-demand analysis via OpenAI API |
| **Linear Import** | Script to migrate existing Linear data |
| **Local Database** | SQLite, persisted to file |

### Excluded from MVP

| Feature | Reason | Future Phase |
|---------|--------|--------------|
| Authentication | Single user, local-only | Phase 2 |
| Cloud deployment | Unnecessary for validation | Phase 2 |
| Telegram bot | Nice-to-have, not core | Phase 3 |
| Mobile optimization | Desktop-first for MVP | Phase 2 |
| Recurring tasks | Complexity, validate basics first | Phase 2 |
| Analytics/metrics | Focus on core workflow | Phase 3 |

---

## Technical Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- OpenAI API key (for journal analysis)

### Project Initialization

```bash
# Create Next.js project
npx create-next-app@latest the-journey --typescript --tailwind --app --src-dir

cd the-journey

# Install dependencies
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3

# Install UI dependencies
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npx shadcn-ui@latest init

# Install shadcn components
npx shadcn-ui@latest add button card dialog input textarea select badge
```

### Database Setup

```typescript
// src/db/index.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('local.db');
export const db = drizzle(sqlite, { schema });
```

```bash
# Generate and apply migrations
npx drizzle-kit generate:sqlite
npx drizzle-kit push:sqlite
```

### Environment Configuration

```bash
# .env.local
OPENAI_API_KEY=sk-your-key-here
```

---

## Feature Specifications

### 1. Kanban Board

#### Day View (Default)

- Shows tasks with `scheduledFor` = today
- Four columns: Backlog, Todo, In Progress, Done
- Drag-and-drop between columns updates status
- Click task to open detail dialog

#### Week View

- Shows 7 days horizontally
- Each day shows scheduled tasks as cards
- Drag tasks between days to reschedule
- Click day to zoom into day view

#### Quarter View

- Shows 12 weeks in a grid
- Each week shows task count and status breakdown
- Click week to zoom into week view
- Good for spotting overloaded weeks

#### Implementation Details

```typescript
// View state management
type ViewLevel = 'day' | 'week' | 'quarter';
type ViewDate = Date; // Current focus date

// URL structure
// / - today's day view
// /week/2024-W03 - week view for ISO week
// /quarter/2024-Q1 - quarter view
```

### 2. Task Management

#### Task Card

Displays:
- Title (truncated if long)
- Domain badge (colored: blue=work, green=side, orange=chores)
- Priority indicator (if set)
- Link count (if linked to other tasks)

#### Task Dialog

Full task editing:
- Title (required)
- Description (markdown supported)
- Status dropdown
- Domain dropdown
- Priority dropdown
- Scheduled date picker
- Project selector
- Linked tasks list with add/remove

#### Task Linking UI

```
┌─────────────────────────────────────────┐
│ Linked Tasks                      [+ Add]│
├─────────────────────────────────────────┤
│ ○ "Set up database schema"    [blocks] ✕ │
│ ○ "Write API documentation"   [related] ✕│
└─────────────────────────────────────────┘
```

### 3. Projects

#### Project List View

- Cards showing project name, type, status
- Task count and completion percentage
- Quick-add project button

#### Project Detail View

- Editable name, description, goals
- Embedded kanban of linked tasks
- Add existing task or create new task for project

### 4. Journal

#### Entry List

- Reverse chronological order
- Shows timestamp and content preview
- Click to expand full entry

#### Entry View

```
┌─────────────────────────────────────────┐
│ January 15, 2024 at 3:42 PM             │
├─────────────────────────────────────────┤
│ Feeling productive today. Finally       │
│ figured out the database schema issue.  │
│ Need to update the API docs and maybe   │
│ refactor the auth middleware.           │
│                                         │
│ Tomorrow I should focus on the frontend │
│ components, especially the kanban drag  │
│ and drop.                               │
├─────────────────────────────────────────┤
│ [Analyze with AI]                       │
└─────────────────────────────────────────┘
```

#### AI Analysis Panel

After clicking "Analyze with AI":

```
┌─────────────────────────────────────────┐
│ AI Analysis                             │
├─────────────────────────────────────────┤
│ Summary: Productive session with        │
│ technical breakthrough. Planning mode   │
│ for upcoming frontend work.             │
│                                         │
│ Energy: High                            │
│ Themes: #database #planning #frontend   │
├─────────────────────────────────────────┤
│ Suggested Tasks:                        │
│ ☐ Update API documentation       [Add]  │
│ ☐ Refactor auth middleware       [Add]  │
│ ☐ Build kanban drag-and-drop     [Add]  │
├─────────────────────────────────────────┤
│ [Add All] [Dismiss]                     │
└─────────────────────────────────────────┘
```

### 5. Linear Import

Script to migrate from Linear:

```typescript
// scripts/import-linear.ts
import { LinearClient } from '@linear/sdk';
import { db } from '../src/db';
import { tasks, projects } from '../src/db/schema';

async function importFromLinear() {
  const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

  // Fetch all issues
  const issues = await linear.issues({
    filter: { team: { key: { eq: 'JOURNEY' } } }
  });

  // Map Linear states to our statuses
  const stateMap: Record<string, Status> = {
    'Backlog': 'backlog',
    'Todo': 'todo',
    'In Progress': 'in_progress',
    'Done': 'done',
    'Canceled': 'done', // or skip
  };

  // Map Linear labels to domains
  const domainMap: Record<string, Domain> = {
    'work': 'work',
    'side-project': 'side',
    'chores': 'chores',
  };

  for (const issue of issues.nodes) {
    await db.insert(tasks).values({
      id: crypto.randomUUID(),
      title: issue.title,
      description: issue.description,
      status: stateMap[issue.state.name] || 'backlog',
      domain: getDomainFromLabels(issue.labels, domainMap),
      priority: mapPriority(issue.priority),
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    });
  }

  console.log(`Imported ${issues.nodes.length} tasks from Linear`);
}

importFromLinear();
```

Run with:
```bash
LINEAR_API_KEY=lin_api_xxx npx ts-node scripts/import-linear.ts
```

---

## UI Components

### Required shadcn Components

```bash
npx shadcn-ui@latest add \
  button \
  card \
  dialog \
  input \
  textarea \
  select \
  badge \
  dropdown-menu \
  calendar \
  popover \
  tabs \
  toast
```

### Custom Components

| Component | Purpose |
|-----------|---------|
| `KanbanBoard` | Main board container with columns |
| `KanbanColumn` | Single status column |
| `TaskCard` | Draggable task card |
| `TaskDialog` | Full task edit modal |
| `ViewSwitcher` | Day/Week/Quarter toggle |
| `DomainFilter` | Filter by work/side/chores |
| `ProjectCard` | Project list item |
| `JournalEntry` | Single journal entry display |
| `AIAnalysisPanel` | AI suggestions display |

---

## Data Flow

### Kanban Drag-and-Drop

```
User drags card
       │
       ▼
┌─────────────────┐
│ @dnd-kit fires  │
│ onDragEnd event │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Optimistic      │
│ state update    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Server Action   │
│ updateTask()    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
 Success   Failure
    │         │
    ▼         ▼
 Done     Rollback
          + Toast
```

### Journal Analysis

```
User clicks "Analyze"
         │
         ▼
┌─────────────────┐
│ Show loading    │
│ spinner         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/ai/   │
│ analyze         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OpenAI API      │
│ with prompt     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse structured│
│ response        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Display analysis│
│ + suggestions   │
└────────┬────────┘
         │
User clicks "Add" on suggestion
         │
         ▼
┌─────────────────┐
│ Create task via │
│ Server Action   │
└─────────────────┘
```

---

## Success Criteria

The MVP is successful when:

1. **Migration complete** - All Linear tasks imported
2. **Daily workflow** - Can plan and execute daily tasks
3. **Weekly planning** - Can review and schedule week ahead
4. **Project tracking** - Can group tasks under projects
5. **Journal habit** - Can write entries and get useful AI insights
6. **Performance** - No noticeable lag in interactions

---

## Development Milestones

### Milestone 1: Foundation
- [ ] Project setup with Next.js, TypeScript, Tailwind
- [ ] Database schema with Drizzle + SQLite
- [ ] Basic task CRUD API

### Milestone 2: Kanban Core
- [ ] Day view with columns
- [ ] Drag-and-drop between columns
- [ ] Task dialog for editing

### Milestone 3: Navigation
- [ ] Week view
- [ ] Quarter view
- [ ] View switching

### Milestone 4: Projects
- [ ] Project CRUD
- [ ] Link tasks to projects
- [ ] Project detail view

### Milestone 5: Journal
- [ ] Journal entry creation
- [ ] Entry list view
- [ ] AI analysis integration

### Milestone 6: Polish
- [ ] Domain filtering
- [ ] Task linking
- [ ] Linear import script
- [ ] Keyboard shortcuts

---

## Local Development

### Running the App

```bash
# Development server
npm run dev

# Open http://localhost:3000
```

### Database Management

```bash
# View database with Drizzle Studio
npx drizzle-kit studio

# Reset database
rm local.db
npx drizzle-kit push:sqlite
```

### Testing AI Integration

```bash
# Test OpenAI API connection
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"content": "Test journal entry about work tasks"}'
```

---

## File Structure (MVP)

```
the-journey/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Day view
│   │   ├── week/[week]/page.tsx     # Week view
│   │   ├── quarter/[quarter]/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── journal/
│   │   │   └── page.tsx
│   │   └── api/
│   │       └── ai/
│   │           └── analyze/route.ts
│   ├── components/
│   │   ├── kanban/
│   │   ├── projects/
│   │   ├── journal/
│   │   └── ui/
│   ├── actions/
│   │   ├── tasks.ts
│   │   ├── projects.ts
│   │   └── journal.ts
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   └── lib/
│       ├── utils.ts
│       └── ai.ts
├── scripts/
│   └── import-linear.ts
├── drizzle.config.ts
├── local.db                          # SQLite database (gitignored)
├── .env.local
└── package.json
```

---

## Next Steps After MVP

Once MVP is validated:

1. **Phase 2**: Deploy to Vercel + Neon, add Clerk auth
2. **Phase 3**: Telegram bot for quick capture
3. **Phase 4**: Mobile PWA or native app
4. **Phase 5**: Analytics and insights dashboard
