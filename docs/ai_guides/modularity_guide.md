# Modularity Guide

Rules for keeping code files small and maintainable.

## File Size Limits

- MUST keep files under 300 lines
- PREFER files under 200 lines
- Split immediately when approaching 300 lines

## When to Extract

- Extract when a function group exceeds 100 lines
- Extract when functionality is reusable across files
- Extract when file becomes hard to navigate
- NEVER extract single functions into separate files
- NEVER extract code used in only one place

## Next.js / React Structure

- `app/` - Pages and API routes
- `components/` - React components, grouped by feature
- `components/ui/` - Generic UI components (shadcn)
- `actions/` - Server Actions
- `hooks/` - Custom React hooks
- `lib/` - Utilities and service modules
- `lib/{service}/` - Provider pattern modules (ai/, db/)
- `types/` - TypeScript types

## Vanilla JS Structure

- `{page}.js` - Entry point (orchestration only)
- `{page}/data-loader.js` - API calls and data fetching
- `{page}/state.js` - State management
- `{page}/render.js` - DOM rendering
- `{page}/events.js` - Event handlers
- `components/` - Reusable UI factories
- `services/` - Backend clients

## Server Structure

- MUST split `server.js` when exceeding 500 lines
- Extract routes to `routes/{resource}.js`
- Keep `server.js` as middleware setup only

## Module Patterns

- MUST use ES modules for frontend and `"type": "module"` projects
- MUST use CommonJS for legacy Node.js without module flag
- MUST export named functions, not default objects

## Naming Conventions

- React components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Server Actions: `camelCase` verbs (createTask, updateTask)
- API routes: `kebab-case` folders

## Import Order

- External packages first
- Internal aliases (`@/`) second
- Relative imports last
