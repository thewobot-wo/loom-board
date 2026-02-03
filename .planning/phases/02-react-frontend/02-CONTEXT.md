# Phase 2: React Frontend - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert the existing vanilla JS Kanban app to React with Convex integration. Achieve full feature parity — all 4 columns, drag-and-drop, search, filtering, activity history, auto-archive, toasts, and keyboard shortcuts work as before, now backed by Convex real-time sync.

</domain>

<decisions>
## Implementation Decisions

### Component Structure
- Feature folders: `components/Board/`, `components/Task/`, `components/Filters/` — related files together
- Medium granularity: Board, Column, TaskCard, TaskModal, FilterBar — logical chunks
- Co-located CSS modules: `TaskCard.tsx` + `TaskCard.module.css` in same folder
- Strict TypeScript with explicit Props interfaces, strict mode, no `any`

### State Management
- Convex hooks directly in components that need data — `useQuery`/`useMutation` where needed, Convex handles caching
- Local `useState` for UI-only state (modal open, filter selection, search text)
- Optimistic updates for moves only — drag-drop feels instant, new tasks wait for server confirmation
- Skeleton loaders during load, toast notifications for errors

### Animations/Transitions
- dnd-kit for drag-and-drop, CSS transitions for other animations — lightweight approach
- Drag feedback: smooth slide with shadow lift — card elevates slightly, slides to new position
- Task creation/deletion: fade in/out — new tasks fade in, deleted tasks fade out
- Filter transitions: subtle fade for filtered results — non-matching cards fade out smoothly

### Build/Dev Experience
- Vite build system with Convex plugin
- Path aliases: `@/components`, `@/hooks` — clean imports
- Strict ESLint + Prettier for consistent style
- Vitest + Testing Library for component tests

### Claude's Discretion
- Exact component file naming conventions
- CSS module class naming patterns
- Specific ESLint rule configuration
- Test file organization

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-react-frontend*
*Context gathered: 2026-02-02*
