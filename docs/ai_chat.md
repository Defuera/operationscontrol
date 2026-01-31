# The Journey - AI Chat System

## Overview

Global AI assistant accessible from any page with full CRUD access to all entities. Uses tool calling to read/modify data with user confirmation for write operations.

---

## Core Principles

- **Context-aware** - Chat knows current page/entity
- **Full access** - Can read and modify any entity
- **User control** - All writes require confirmation
- **Auditable** - Every action logged with before/after snapshots
- **Reversible** - Any AI change can be reverted

---

## Thread Model

### Thread per Entity

Threads are **anchored** to entities for organization, but AI can access the entire system from any thread.

| Concept | Description |
|---------|-------------|
| **Anchor Entity** | Where thread lives (for navigation) |
| **Target Entity** | What AI reads/modifies (can be anything) |

### Thread Types

| Type | Anchor | Example |
|------|--------|---------|
| Entity | Task, Project, Goal | Chat about specific task |
| Page | "kanban", "journal" | General page discussions |
| Global | null | System-wide chat |
| Telegram | Telegram user ID | Bot conversations |

---

## Action System

AI proposes actions, user confirms, then we execute with snapshots.

### Action Lifecycle

```
User message → AI proposes action → UI shows diff → User confirms → Execute with snapshot
                                                  → User rejects → Mark rejected
```

### Action Schema

```typescript
interface AIAction {
  id: string;
  messageId: string;
  actionType: 'create' | 'update' | 'delete';
  entityType: 'task' | 'project' | 'goal' | 'journal';
  entityId: string | null;
  payload: Record<string, unknown>;
  status: 'proposed' | 'confirmed' | 'executed' | 'rejected' | 'reverted';
  snapshotBefore: Record<string, unknown> | null;
  snapshotAfter: Record<string, unknown> | null;
  createdAt: Date;
  executedAt: Date | null;
  revertedAt: Date | null;
}
```

### Tools

**Read tools** (no confirmation):
- `getTasks`, `getTask`, `getProjects`, `getProject`, `getGoals`, `getGoal`, `getJournalEntries`, `searchAll`

**Write tools** (require confirmation):
- `createTask`, `updateTask`, `deleteTask`
- `createProject`, `updateProject`, `deleteProject`
- `createGoal`, `updateGoal`, `deleteGoal`
- `createJournalEntry`, `updateJournalEntry`, `deleteJournalEntry`

---

## Data Model

```typescript
// Threads
export const aiThreads = sqliteTable('ai_threads', {
  id: text('id').primaryKey(),
  anchorEntityType: text('anchor_entity_type'),  // task, project, goal, journal, page, telegram
  anchorEntityId: text('anchor_entity_id'),
  title: text('title'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Messages
export const aiMessages = sqliteTable('ai_messages', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull().references(() => aiThreads.id),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  toolCalls: text('tool_calls'),  // JSON
  createdAt: text('created_at').notNull(),
});

// Actions
export const aiActions = sqliteTable('ai_actions', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => aiMessages.id),
  actionType: text('action_type', { enum: ['create', 'update', 'delete'] }).notNull(),
  entityType: text('entity_type', { enum: ['task', 'project', 'goal', 'journal'] }).notNull(),
  entityId: text('entity_id'),
  payload: text('payload').notNull(),  // JSON
  status: text('status', { enum: ['proposed', 'confirmed', 'executed', 'rejected', 'reverted'] }).notNull(),
  snapshotBefore: text('snapshot_before'),  // JSON
  snapshotAfter: text('snapshot_after'),    // JSON
  createdAt: text('created_at').notNull(),
  executedAt: text('executed_at'),
  revertedAt: text('reverted_at'),
});
```

---

## UI Components

```
<AIProvider>                    // Global state
  <App>
    <AIContextProvider>         // Page context: { type: 'task', entityId: '123' }
      <PageContent />
    </AIContextProvider>
    <AIChatDrawer />            // Floating button → slide-out panel
  </App>
</AIProvider>
```

**AIChatDrawer**: Collapsed (floating button) or expanded (chat panel with thread history, messages, confirmation dialogs).

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ai/chat` | POST | Send message, get response + proposed actions |
| `/api/ai/actions/[id]/confirm` | POST | Confirm and execute action |
| `/api/ai/actions/[id]/reject` | POST | Reject action |
| `/api/ai/actions/[id]/revert` | POST | Revert executed action |
| `/api/ai/threads` | GET | List threads (filter by anchor) |
| `/api/ai/threads/[id]` | GET | Get thread with messages |
| `/api/ai/actions` | GET | Action history (filter by entity) |

---

## Telegram Integration

Telegram bot provides alternative interface using the same AI core.

### Flow

```
Telegram webhook → /api/telegram/webhook → processAIChat() → Reply via Telegram API
                                               ↑
                                    Same logic as web chat
```

### Confirmations via Inline Keyboards

```
Bot: I'll update "Water plants"
     status: todo → done

     [✅ Confirm]  [❌ Cancel]
```

### Quick Commands

| Command | Action |
|---------|--------|
| `/today` | List today's tasks |
| `/add <task>` | Quick-add to backlog |
| `/status` | Current in-progress tasks |
| `/undo` | Revert last AI action |

---

## Security Rules

- Maximum 5 pending actions at once
- Delete actions require explicit confirmation
- Rate limit: 50 messages/hour per user
- All actions validated with zod schemas

---

## Implementation Phases

1. **Foundation** - Schema, basic chat UI, thread persistence
2. **Read Tools** - Implement read tools, display in chat
3. **Write Tools** - Action proposals, confirmation UI, diff preview, snapshots
4. **Context System** - Page context providers, thread anchoring
5. **History & Revert** - Action history view, revert functionality
6. **Telegram** - Bot setup, webhook, inline confirmations
