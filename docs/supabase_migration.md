# Supabase Migration Plan

## Why Supabase?

- **Real-time subscriptions** - UI updates instantly when data changes (from Telegram, AI, or another tab)
- **PostgreSQL** - More powerful than SQLite (JSON queries, full-text search, etc.)
- **Drizzle compatible** - Minimal code changes, same ORM
- **Free tier** - 500MB database, 2 GB bandwidth, unlimited API requests
- **Auth ready** - If we need multi-user support later

## Current Stack

```
SQLite (better-sqlite3) → Drizzle ORM → Next.js
```

## Target Stack

```
Supabase (PostgreSQL) → Drizzle ORM → Next.js
                      → Supabase Realtime → React hooks
```

---

## Migration Steps

### Phase 1: Setup Supabase

1. Create Supabase project at https://supabase.com
2. Get connection string from Settings → Database
3. Add to `.env`:
   ```
   DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
   ```

### Phase 2: Update Drizzle Config

**Current** (`drizzle.config.ts`):
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'local.db',
  },
});
```

**New**:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Phase 3: Update Schema

**Current** (`src/db/schema.ts`):
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
```

**New**:
```typescript
import { pgTable, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core';
```

Key changes:
| SQLite | PostgreSQL |
|--------|------------|
| `sqliteTable` | `pgTable` |
| `text('id').primaryKey()` | `uuid('id').primaryKey().defaultRandom()` |
| `text('created_at')` | `timestamp('created_at').defaultNow()` |
| `integer('priority')` | `integer('priority')` (same) |

### Phase 4: Update DB Connection

**Current** (`src/db/index.ts`):
```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database('local.db');
export const db = drizzle(sqlite, { schema });
```

**New**:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

### Phase 5: Add Supabase Client (for real-time)

```bash
npm install @supabase/supabase-js
```

**New file** (`src/lib/supabase.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Phase 6: Add Real-time Hook

**New file** (`src/hooks/useRealtimeSubscription.ts`):
```typescript
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeSubscription(
  table: string,
  onUpdate: () => void
) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onUpdate]);
}
```

### Phase 7: Use in Components

```typescript
// In any page/component
const [tasks, setTasks] = useState<Task[]>([]);

const loadTasks = async () => {
  const data = await getTasks();
  setTasks(data);
};

// Reload when database changes
useRealtimeSubscription('tasks', loadTasks);
```

---

## Schema Conversion Reference

### Tasks Table

```typescript
// Before (SQLite)
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status', { enum: ['backlog', 'todo', 'in_progress', 'done'] }).notNull().default('backlog'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// After (PostgreSQL)
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  status: text('status', { enum: ['backlog', 'todo', 'in_progress', 'done'] }).notNull().default('backlog'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### All Tables to Convert

- [ ] tasks
- [ ] projects
- [ ] goals
- [ ] journalEntries
- [ ] taskLinks
- [ ] aiThreads
- [ ] aiMessages
- [ ] aiActions

---

## Data Migration

Option A: **Fresh start** (recommended for dev)
- Just run `npx drizzle-kit push`
- Manually recreate test data

Option B: **Export/Import**
```bash
# Export from SQLite
sqlite3 local.db .dump > backup.sql

# Transform SQL syntax (manual or script)
# Import to Supabase via SQL editor
```

---

## Package Changes

Remove:
```bash
npm uninstall better-sqlite3 @types/better-sqlite3
```

Add:
```bash
npm install postgres @supabase/supabase-js
```

---

## Enable Real-time in Supabase

In Supabase Dashboard:
1. Go to Database → Replication
2. Enable replication for tables: `tasks`, `projects`, `goals`, `journal_entries`
3. Or run SQL:
   ```sql
   alter publication supabase_realtime add table tasks;
   alter publication supabase_realtime add table projects;
   alter publication supabase_realtime add table goals;
   alter publication supabase_realtime add table journal_entries;
   ```

---

## Testing Checklist

- [ ] Drizzle connects to Supabase
- [ ] Schema pushed successfully
- [ ] CRUD operations work
- [ ] Real-time subscription receives updates
- [ ] Telegram bot changes trigger UI updates
- [ ] AI chat changes trigger UI updates

---

## Rollback Plan

Keep `local.db` and SQLite dependencies until migration is verified. Can switch back by reverting:
- `drizzle.config.ts`
- `src/db/schema.ts`
- `src/db/index.ts`
- `.env` (remove Supabase vars)
