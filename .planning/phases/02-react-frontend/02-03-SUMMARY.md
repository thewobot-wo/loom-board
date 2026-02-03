---
phase: 02-react-frontend
plan: 03
subsystem: ui
tags: [react, dnd-kit, convex, optimistic-updates, drag-drop, kanban]

# Dependency graph
requires:
  - phase: 02-02
    provides: Board, Column, TaskCard components
  - phase: 01-02
    provides: updateTask mutation for status changes
provides:
  - Drag-and-drop between Kanban columns
  - Optimistic updates for instant UI feedback
  - SortableTaskCard component with useSortable
  - useTaskMutations hook with withOptimisticUpdate
  - Keyboard accessible drag-and-drop
affects: [03-authentication, 04-mcp-assistant]

# Tech tracking
tech-stack:
  added: [@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities]
  patterns: [optimistic-updates, sensor-based-dnd, droppable-columns]

key-files:
  created:
    - src/components/Task/SortableTaskCard.tsx
    - src/hooks/useTaskMutations.ts
    - src/hooks/index.ts
  modified:
    - src/components/Board/Board.tsx
    - src/components/Board/Board.module.css
    - src/components/Column/Column.tsx
    - src/components/Task/TaskCard.module.css
    - src/components/Task/index.ts

key-decisions:
  - "dnd-kit over react-beautiful-dnd: actively maintained, better TypeScript support"
  - "Optimistic update only for status changes: other mutations wait for server confirmation"
  - "8px activation distance: prevents accidental drags from clicks"

patterns-established:
  - "useTaskMutations hook: centralized mutation handling with optimistic updates"
  - "SortableTaskCard wrapper: separates drag logic from presentation"
  - "Column as drop target: useDroppable on task list area"

# Metrics
duration: 3min
completed: 2026-02-02
---

# Phase 2 Plan 3: Drag and Drop Summary

**Cross-column drag-and-drop with dnd-kit, optimistic updates via Convex, and keyboard accessibility**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-02T19:43:00Z
- **Completed:** 2026-02-02T19:46:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Dragging tasks between columns with instant visual feedback
- Optimistic updates via withOptimisticUpdate for status changes
- DragOverlay showing elevated card with rotation effect
- Column highlighting when dragging over (isOver state)
- Keyboard navigation support via KeyboardSensor

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dnd-kit and create SortableTaskCard** - `14d89b3` (feat)
2. **Task 2: Create useTaskMutations hook with optimistic updates** - `cd679d5` (feat)
3. **Task 3: Integrate DndContext in Board with drag handlers** - `baea5f1` (feat)

## Files Created/Modified

- `src/components/Task/SortableTaskCard.tsx` - Wrapper with useSortable hook for drag capability
- `src/components/Task/TaskCard.module.css` - Added dragOverlay styles
- `src/components/Task/index.ts` - Export SortableTaskCard
- `src/hooks/useTaskMutations.ts` - Mutations with optimistic updates for updateTask and archiveTask
- `src/hooks/index.ts` - Hooks barrel export
- `src/components/Board/Board.tsx` - DndContext with sensors and drag handlers
- `src/components/Board/Board.module.css` - Drag overlay transform and shadow
- `src/components/Column/Column.tsx` - useDroppable and SortableContext integration

## Decisions Made

- **dnd-kit library choice:** Modern, actively maintained, excellent TypeScript support, Tree-shakeable
- **PointerSensor with 8px distance:** Prevents accidental drag when clicking
- **Optimistic update scope:** Only status changes get optimistic updates; archiveTask removes from list optimistically
- **Drop target identification:** over.id can be column status or task ID, handled both cases

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TaskModal computed property TypeScript error**
- **Found during:** Task 2 (verifying TypeScript compilation)
- **Issue:** Pre-existing TaskModal.tsx had computed property name error blocking `npm run build`
- **Fix:** Used explicit priority style map instead of dynamic key indexing
- **Files modified:** src/components/Task/TaskModal.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** cd679d5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Pre-existing bug fix necessary for successful build. No scope creep.

## Issues Encountered
None - dnd-kit integration worked as expected.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Drag-and-drop fully functional between all 4 columns
- Optimistic updates provide instant feedback
- Ready for authentication integration (Phase 3)
- Task modal can use useTaskMutations hook for create/edit/archive

---
*Phase: 02-react-frontend*
*Completed: 2026-02-02*
