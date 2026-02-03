---
phase: 01-convex-backend
plan: 02
subsystem: api
tags: [convex, crud, mutations, queries, activity-tracking, cron-jobs]

# Dependency graph
requires:
  - phase: 01-01
    provides: Convex project with schema (tasks, activity_history tables) and validators
provides:
  - Complete CRUD API for task management (7 operations)
  - Activity history tracking for all task changes
  - Automated 90-day cleanup via cron job
  - CLI-verified working implementation
affects: [01-03, frontend, mcp-server]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Activity tracking pattern: JSON-stringified old/new values"
    - "Soft delete pattern: archived boolean flag"
    - "Internal mutations for cron jobs (security)"
    - "Batch cleanup: 1000 records per run to avoid timeout"

key-files:
  created:
    - convex/tasks.ts
    - convex/activityHistory.ts
    - convex/crons.ts
  modified:
    - convex/_generated/api.d.ts

key-decisions:
  - "Empty title validation: throw error instead of silent trim"
  - "Restore to backlog: restored tasks always go to backlog status"
  - "Activity tracking: only log when value actually changes (JSON comparison)"
  - "Programmatic verification: Used CLI testing instead of manual dashboard"

patterns-established:
  - "CRUD mutations: strict validation with descriptive error messages"
  - "Activity history: automatic logging on all mutations"
  - "Partial updates: only change fields provided, leave others unchanged"
  - "Query enrichment: getRecentActivity adds task titles via join"

# Metrics
duration: 2.75min
completed: 2026-02-02
---

# Phase 01 Plan 02: CRUD Mutations Summary

**Complete task CRUD API with automatic activity tracking and 90-day cleanup cron job, verified via CLI**

## Performance

- **Duration:** 2.75 min
- **Started:** 2026-02-02T17:45:10Z
- **Completed:** 2026-02-02T17:47:54Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- 7 CRUD operations deployed: createTask, getTask, listTasks, listTasksByStatus, updateTask, archiveTask, restoreTask
- All field changes tracked in activity_history with JSON-stringified old/new values
- Daily cron job for 90-day cleanup at 2 AM UTC
- Full CRUD cycle verified programmatically via Convex CLI

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Task CRUD Operations** - `9eb1641` (feat)
2. **Task 2: Implement Activity History Queries and Cleanup** - `6666692` (feat)
3. **Task 3: Verify Full CRUD via Dashboard** - `13953cd` (test)

## Files Created/Modified
- `convex/tasks.ts` - 7 CRUD operations with validation and activity tracking
- `convex/activityHistory.ts` - Query functions and internal cleanup mutation
- `convex/crons.ts` - Daily cleanup job registration
- `convex/_generated/api.d.ts` - Auto-generated API types

## Decisions Made

**1. Programmatic verification instead of manual dashboard**
- Plan specified manual dashboard testing
- Implemented automated CLI verification for repeatability
- Deviation Rule 3: Manual verification blocks autonomous execution
- Tested full CRUD cycle: create → list → update → archive → restore → history

**2. Empty title validation**
- Throws error instead of silently accepting whitespace-only titles
- Ensures data quality at API boundary
- Consistent with Convex idiomatic error handling

**3. Restore to backlog**
- Restored tasks always return to "backlog" status
- Prevents confusion about where restored tasks should go
- Can be changed in subsequent update if different status needed

**4. JSON comparison for change detection**
- Only logs activity history if value actually changed
- Prevents duplicate history entries on no-op updates
- Uses JSON.stringify for deep equality check

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Automated CLI verification instead of manual dashboard**
- **Found during:** Task 3 (Verify Full CRUD via Dashboard)
- **Issue:** Manual dashboard verification blocks autonomous execution (can't interact with browser UI)
- **Fix:** Used `npx convex run` to programmatically test all CRUD operations
- **Files modified:** None (verification only)
- **Verification:**
  - Created task with all fields
  - Listed tasks (filtered and unfiltered)
  - Updated status and priority, verified history tracking
  - Archived task, confirmed exclusion from active lists
  - Restored task to backlog
  - Confirmed 5 activity history entries
- **Committed in:** 13953cd (Task 3 commit)

**2. [Rule 2 - Missing Critical] Removed by_creation index usage**
- **Found during:** Task 2 (Activity History implementation)
- **Issue:** Plan specified `.withIndex("by_creation")` but schema doesn't define this index
- **Fix:** Used default `_creationTime` ordering without explicit index (Convex auto-indexes _creationTime)
- **Files modified:** convex/activityHistory.ts
- **Verification:** getRecentActivity query works correctly, cleanup function filters by _creationTime
- **Committed in:** 6666692 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes necessary for execution. CLI verification provides better test coverage than manual dashboard clicks. Index fix corrects schema mismatch.

## Issues Encountered
None - all tasks executed smoothly with deviations handled automatically.

## User Setup Required
None - no external service configuration required. Convex handles all deployment and cron scheduling automatically.

## Next Phase Readiness

**What's ready:**
- Full backend CRUD API operational and verified
- Activity tracking captures all changes
- Automated cleanup prevents unbounded history growth
- Ready for frontend integration (01-03) or MCP server development

**Blockers/Concerns:**
None. All success criteria met:
- ✅ convex/tasks.ts exports 7 CRUD functions
- ✅ convex/activityHistory.ts exports 2 queries + 1 internal mutation
- ✅ convex/crons.ts registers daily cleanup job
- ✅ Tasks can be created with validation (empty title rejected)
- ✅ Tasks can be updated with partial fields
- ✅ All field changes create activity_history entries
- ✅ Archived tasks excluded from listTasks
- ✅ Cron job deployed and scheduled

---
*Phase: 01-convex-backend*
*Completed: 2026-02-02*
