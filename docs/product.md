# The Journey - Product Specification

## Overview

The Journey is a personal productivity system designed to manage tasks across three life domains: Work, Side Projects, and Chores. It emphasizes steady progress over speed, realistic scoping, and balance across all areas of life.

## Core Philosophy

- **Steady progress over speed** - Small consistent steps beat intense bursts
- **Realistic scoping** - Tasks should be completable in focused sessions
- **Balance** - Distribute effort across all three domains
- **Energy awareness** - Match task difficulty to available energy levels

---

## Features

### 1. Kanban Board

The central interface for task management with three zoom levels.

#### Zoom Levels

| Level | View | Use Case |
|-------|------|----------|
| Quarter | 12-week overview | Strategic planning, big picture goals |
| Week | 7-day view | Weekly planning and sprint-style work |
| Day | Single day focus | Daily execution, "what's next?" |

#### Columns

- **Backlog** - Tasks captured but not yet planned
- **Todo** - Tasks ready to be worked on
- **In Progress** - Currently active tasks (limit: 3 recommended)
- **Done** - Completed tasks

#### Task Properties

| Property | Type | Description |
|----------|------|-------------|
| Title | string | Short, action-oriented description |
| Description | string (optional) | Additional context, acceptance criteria |
| Status | enum | backlog, todo, in_progress, done |
| Domain | enum | work, side, chores |
| Priority | 0-4 | 0=none, 1=urgent, 2=high, 3=medium, 4=low |
| Scheduled For | date (optional) | Target date for completion |
| Project | reference (optional) | Link to parent project |
| Linked Tasks | references | Flexible links to related tasks |

#### Task Linking

Tasks can be linked to each other in a flexible, non-hierarchical way. Link types include:

- **blocks** - This task must complete before the linked task can start
- **related** - Tasks that share context but no dependency
- **subtask** - Logical grouping without strict hierarchy

This flexibility allows organic relationships between tasks without forcing artificial parent-child structures.

---

### 2. Projects

Projects are containers for related tasks, notes, and goals. They provide context and tracking for larger initiatives.

#### Project Types

| Type | Description | Examples |
|------|-------------|----------|
| Side Project | Personal development or creative work | App ideas, writing, art |
| Learning | Skill acquisition goals | New language, course, certification |
| Life | Life improvements and habits | Fitness goal, financial planning |

#### Project Properties

| Property | Type | Description |
|----------|------|-------------|
| Name | string | Project title |
| Description | string | What this project is about |
| Type | enum | side_project, learning, life |
| Status | enum | active, completed, archived |
| Goals | text | What success looks like |
| Linked Tasks | references | All tasks associated with this project |

#### Project Views

- **List view** - All projects with status and progress indicators
- **Detail view** - Full project info with linked tasks as embedded kanban

---

### 3. Journal

Freeform journaling with AI-powered analysis. Not time-bound - entries can be made anytime, not just as daily reflections.

#### Entry Properties

| Property | Type | Description |
|----------|------|-------------|
| Content | text | Freeform journal entry |
| Created At | timestamp | When the entry was written |
| AI Analysis | text (optional) | Generated insights from Claude |

#### AI Integration

AI analysis is **on-demand only** - triggered by an "Analyze" button. The AI:

1. **Analyzes** the journal entry for:
   - Emotional state and energy levels
   - Mentioned tasks or todos (explicit or implicit)
   - Progress updates on existing work
   - Blockers or frustrations
   - Ideas and inspirations

2. **Suggests actions**:
   - Create new tasks from mentioned items
   - Update existing task statuses
   - Link entries to projects
   - Propose schedule adjustments based on energy

3. **User confirms** all AI suggestions before any changes are made

---

### 4. Telegram Bot (Future)

A conversational interface for quick interactions with The Journey.

#### Planned Commands

| Command | Description |
|---------|-------------|
| `/add <task>` | Quick-add a task to backlog |
| `/today` | List today's scheduled tasks |
| `/week` | Weekly summary |
| `/journal <text>` | Add a journal entry |
| `/status` | Current in-progress tasks |

---

## User Stories

### Kanban

```
As a user, I want to see my tasks in a kanban board
so that I can visualize my workflow and progress.

As a user, I want to switch between day/week/quarter views
so that I can plan at different time horizons.

As a user, I want to drag tasks between columns
so that I can quickly update their status.

As a user, I want to filter tasks by domain
so that I can focus on one area of my life.

As a user, I want to link related tasks
so that I can see connections without rigid hierarchies.
```

### Projects

```
As a user, I want to group tasks under projects
so that I can track progress on larger initiatives.

As a user, I want to see project progress at a glance
so that I know which projects need attention.

As a user, I want to archive completed projects
so that they don't clutter my active view.
```

### Journal

```
As a user, I want to write freeform journal entries
so that I can capture thoughts and reflections.

As a user, I want to request AI analysis of my entries
so that I can extract actionable insights.

As a user, I want to review AI suggestions before applying
so that I stay in control of my task system.
```

---

## Data Model

### Entity Relationship

```
┌─────────────┐       ┌─────────────┐
│   Project   │───────│    Task     │
└─────────────┘  1:N  └─────────────┘
                            │
                            │ N:N (via TaskLink)
                            │
                      ┌─────────────┐
                      │  TaskLink   │
                      └─────────────┘

┌─────────────┐
│JournalEntry │  (standalone)
└─────────────┘
```

### Task

```typescript
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'done';
  domain: 'work' | 'side' | 'chores';
  priority: 0 | 1 | 2 | 3 | 4;
  scheduledFor: Date | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Project

```typescript
interface Project {
  id: string;
  name: string;
  description: string | null;
  type: 'side_project' | 'learning' | 'life';
  status: 'active' | 'completed' | 'archived';
  goals: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### TaskLink

```typescript
interface TaskLink {
  id: string;
  taskAId: string;
  taskBId: string;
  linkType: 'blocks' | 'related' | 'subtask';
  createdAt: Date;
}
```

### JournalEntry

```typescript
interface JournalEntry {
  id: string;
  content: string;
  aiAnalysis: string | null;
  createdAt: Date;
}
```

---

## Non-Functional Requirements

### Performance
- Page load under 1 second
- Drag-and-drop feels instantaneous (optimistic updates)
- AI analysis completes within 10 seconds

### Usability
- Works on desktop browsers (Chrome, Firefox, Safari)
- Keyboard shortcuts for power users
- Mobile-responsive (read-only acceptable for MVP)

### Data
- All data persisted locally for MVP
- Export functionality for backup
- Linear import for migration

---

## Future Considerations

- **Mobile app** - Native iOS/Android for on-the-go capture
- **Team features** - Shared projects and task assignment
- **Integrations** - Calendar sync, GitHub issues, email
- **Analytics** - Velocity tracking, domain balance metrics
- **Recurring tasks** - Weekly reviews, daily habits
