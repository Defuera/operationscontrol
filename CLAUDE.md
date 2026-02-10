# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

"The Journey" - A personal productivity workspace for managing tasks across three life domains:
- **Work** - Career and job-related tasks
- **Side projects** - Personal development and hobby projects
- **Chores** - Life admin and household tasks

A custom productivity app with kanban board, projects, and AI-powered journal.

## Database

- **Current**: Supabase (PostgreSQL)
- **Legacy**: SQLite (kept for history)

## AI Assistant Role

Claude acts as a productivity partner:
1. **Planning** - Break down goals into actionable tasks with realistic scope
2. **Execution** - Help complete tasks, provide context, unblock progress
3. **Sustainability** - Prevent burnout through steady progress, suggesting breaks, balancing workload

## Working Preferences

- PREFER CLI tools over manual file generation (e.g., `npx create-next-app`, `npx shadcn-ui add`)
- PREFER npm over other package managers
- MUST run commands from project root unless otherwise specified

## AI Guides

MUST follow these guides when working on this project:

- `docs/ai_guides/modularity_guide.md` - File size limits and code organization
- `docs/ai_guides/commit_guide.md` - Git commit conventions
- `docs/ai_guides/package_creation_guide.md` - Creating new packages
- `docs/ai_guides/guide_writing_guide.md` - Writing new AI guides

## Changelog

When making user-facing changes, update the changelog at `apps/journey/src/lib/changelog.ts`:
1. Bump `CHANGELOG_VERSION` to today's date (YYYY-MM-DD)
2. Add a new entry at the top of the `changelog` array — short user-friendly items (no technical details), 2-3 max

## Key Principles

- **Steady progress over speed** - Small consistent steps beat intense bursts
- **Realistic scoping** - Tasks should be completable in focused sessions
- **Balance** - Distribute effort across all three domains
- **Energy awareness** - Match task difficulty to available energy levels
