---
phase: "05"
plan: "01"
subsystem: "migration-data-layer"
tags: ["migration", "localStorage", "convex-mutation", "data-transformation"]
dependency_graph:
  requires: ["01-01", "03-02"]
  provides: ["migration-utilities", "migration-mutation"]
  affects: ["05-02"]
tech_stack:
  added: []
  patterns: ["client-side-transformation", "batch-insert-mutation", "type-guard-validation"]
key_files:
  created:
    - "src/lib/migration.ts"
    - "convex/migration.ts"
  modified: []
decisions:
  - id: "05-01-01"
    decision: "Empty tags array for missing tag"
    rationale: "RESEARCH.md suggested [\"project\"] default but plan specifies empty array; empty is safer (no assumptions)"
metrics:
  duration: "1.4m"
  completed: "2026-02-03"
---

# Phase 5 Plan 1: Migration Data Layer Summary

**Client-side localStorage reading/validation/transformation utilities and Convex batch-insert mutation with auth and activity history**

## What Was Done

### Task 1: Client-side migration utilities (`src/lib/migration.ts`)
- **LocalStorageTask interface** matching v1.0 format with all 12 fields (id, title, description, status, priority, tag, dueDate, createdAt, archived, blockedReason, startedAt, completedAt, blockedSince)
- **STATUS_MAP** maps all 4 v1.0 statuses: backlog->backlog, in-progress->in_progress, blocked->blocked, done->done
- **PRIORITY_MAP** maps all 4 v1.0 priorities: p0->urgent, p1->high, p2->medium, p3->low
- **readLocalStorageTasks()** reads `loom-tasks` key, parses JSON, validates `tasks` array exists, returns null on any failure
- **isValidV1Task()** type guard checks required fields (id string, non-empty title string, status in valid set) and validates optional field types
- **transformTask()** handles all schema differences: status hyphen->underscore, priority code->name, singular tag->tags array, dueDate string->number (with NaN guard), preserves createdAt in updatedAt for ordering
- **hasMigrated()/markMigrated()/clearLocalStorageTasks()** for migration lifecycle flags

### Task 2: Convex migration mutation (`convex/migration.ts`)
- **migrateLocalTasks mutation** accepts pre-transformed task array with all Convex-compatible fields
- Authenticates via `getAuthUserId`, throws "Not authenticated" if no user
- Loops over tasks: inserts into `tasks` table with `archived: false` and authenticated `userId`
- Creates `_migrated` activity history entry for each task with source metadata
- Returns `{ imported: count }` for success reporting
- Uses `as any` casting for status/priority since values are guaranteed correct from client-side mapping

## Commits

| Hash | Type | Description |
|------|------|-------------|
| ff59e6b | feat | Client-side migration utilities (6 functions, 5 constants, 1 interface) |
| 496f115 | feat | Convex migration mutation with auth and activity history |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **Empty tags array for missing tag** -- When a v1.0 task has no `tag` field, use empty array `[]` rather than defaulting to `["project"]`. The plan explicitly specifies `task.tag ? [task.tag] : []` which is safer than assuming a default.

## Verification Results

- TypeScript compilation: PASS (both `tsc --noEmit` and `tsc --noEmit -p convex/tsconfig.json`)
- All 6 functions exported from `src/lib/migration.ts`
- `migrateLocalTasks` mutation exported from `convex/migration.ts`
- STATUS_MAP covers all 4 v1.0 statuses with correct mappings
- PRIORITY_MAP covers all 4 v1.0 priorities with correct mappings
- transformTask produces `undefined` for invalid dueDate (NaN check)

## Next Phase Readiness

Plan 05-02 (Migration UI) can now build the MigrationModal component that uses these utilities:
- Import `readLocalStorageTasks`, `isValidV1Task`, `transformTask`, `hasMigrated`, `markMigrated`, `clearLocalStorageTasks` from `src/lib/migration.ts`
- Call `migrateLocalTasks` mutation from `convex/migration.ts` via `useMutation`
- All data transformation is handled -- the UI only needs to orchestrate the flow
