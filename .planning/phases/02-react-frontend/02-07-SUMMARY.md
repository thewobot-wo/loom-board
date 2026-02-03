---
phase: 02-react-frontend
plan: 07
subsystem: ui
tags: [react, react-hotkeys-hook, convex, archive, keyboard-shortcuts]

# Dependency graph
requires:
  - phase: 02-06
    provides: History panel, toast notifications, activity history display
  - phase: 01-02
    provides: archiveTask, restoreTask mutations, by_archived index
provides:
  - listArchivedTasks query for archived task retrieval
  - ArchiveSection component with collapsible UI and restore
  - useAutoArchive hook for 7-day done task auto-archive
  - useKeyboardShortcuts hook with global keyboard handling
  - Full feature parity with vanilla app
affects: [03-auth-integration, 04-mcp-server]

# Tech tracking
tech-stack:
  added: [react-hotkeys-hook]
  patterns: [global keyboard hooks, auto-archive background process, collapsible sections]

key-files:
  created:
    - src/hooks/useAutoArchive.ts
    - src/hooks/useKeyboardShortcuts.ts
    - src/components/Archive/ArchiveSection.tsx
    - src/components/Archive/ArchiveSection.module.css
    - src/components/Archive/index.ts
  modified:
    - convex/tasks.ts
    - src/hooks/index.ts
    - src/App.tsx
    - package.json

key-decisions:
  - "react-hotkeys-hook for keyboard shortcuts: simple API, active maintenance"
  - "Auto-archive uses updatedAt as completion time proxy"
  - "processedRef prevents duplicate archive calls"
  - "Archive hidden when empty (0 archived tasks)"

patterns-established:
  - "useHotkeys with enableOnFormTags: false for global shortcuts"
  - "Background effect hook pattern for auto-archive"
  - "Collapsible section with conditional render"

# Metrics
duration: 4min
completed: 2026-02-02
---

# Phase 2 Plan 7: Archive & Keyboard Shortcuts Summary

**Auto-archive for 7-day old done tasks, collapsible archive section with restore, and global keyboard shortcuts using react-hotkeys-hook**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-02T11:56:00Z
- **Completed:** 2026-02-02T12:00:00Z
- **Tasks:** 4 (3 auto + 1 human-verify checkpoint)
- **Files modified:** 9

## Accomplishments
- listArchivedTasks Convex query using by_archived index
- Auto-archive hook for tasks done 7+ days
- Archive section with collapsible UI and click-to-restore
- Global keyboard shortcuts: Cmd+N (new), / (search), Cmd+H (history), Escape (close)
- Full feature parity with vanilla loom-board.html verified

## Task Commits

Each task was committed atomically:

1. **Task 1: Add listArchivedTasks query and install react-hotkeys-hook** - `b313aa0` (feat)
2. **Task 2: Create Archive section and auto-archive hook** - `cae4f8e` (feat)
3. **Task 3: Create keyboard shortcuts hook and integrate all in App** - `fc89c3d` (feat)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified
- `convex/tasks.ts` - Added listArchivedTasks query
- `src/hooks/useAutoArchive.ts` - Background auto-archive for old done tasks
- `src/hooks/useKeyboardShortcuts.ts` - Global keyboard shortcut handler
- `src/components/Archive/ArchiveSection.tsx` - Collapsible archive UI with restore
- `src/components/Archive/ArchiveSection.module.css` - Archive section styles
- `src/components/Archive/index.ts` - Barrel export
- `src/hooks/index.ts` - Export new hooks
- `src/App.tsx` - Integrated archive, auto-archive, and keyboard shortcuts
- `package.json` - Added react-hotkeys-hook dependency

## Decisions Made
- **react-hotkeys-hook:** Simple hook API, actively maintained, handles mod key cross-platform
- **Auto-archive timing:** Uses updatedAt as proxy for completion time (when task moved to done)
- **processedRef pattern:** Ref tracks already-processed tasks to prevent duplicate archive calls
- **Archive visibility:** Section completely hidden when no archived tasks (returns null)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 2 (React Frontend) complete with full feature parity
- Ready for Phase 3 (Authentication Integration)
- Convex backend has all required queries and mutations
- UI components ready for auth-protected routes

---
*Phase: 02-react-frontend*
*Completed: 2026-02-02*
