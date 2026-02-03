---
phase: 01-convex-backend
plan: 01
subsystem: database
tags: [convex, schema, database, initialization]
requires:
  - milestone: v1.1
  - decision: convex-over-vercel-kv
provides:
  - convex-deployment: precise-monitor-542.convex.cloud
  - tasks-table: schema with status/priority/tags/order fields
  - activity-history-table: change tracking with task references
  - indexes: by_status_order, by_priority, by_dueDate, by_archived, by_task
affects:
  - 01-02: CRUD mutations will use this schema
  - 01-03: Query functions will use these indexes
  - 02-*: Kanban UI will render tasks from this structure
  - 04-*: MCP server will read/write using these tables
tech-stack:
  added:
    - convex: "^1.31.7"
  patterns:
    - convex-schema-validators: Union literals for enums (status, priority)
    - soft-delete: archived boolean flag instead of hard delete
    - activity-tracking: Separate table with JSON-stringified old/new values
key-files:
  created:
    - convex/schema.ts: Schema definition with tasks and activity_history tables
    - .env.local: Convex deployment URL (tracked in git)
    - convex/_generated/: Type definitions for schema
  modified:
    - package.json: Added convex dependency
    - .gitignore: Updated to track .env.local for Convex
decisions:
  - id: enum-as-union-literals
    choice: "Use v.union(v.literal(...)) for status and priority enums"
    rationale: "Convex-idiomatic approach, provides type safety and validation"
    alternatives: ["string with runtime validation", "numeric enums"]
  - id: activity-history-json-strings
    choice: "Store old/new values as JSON stringified strings"
    rationale: "Flexible for different field types, easier to evolve schema"
    alternatives: ["typed union for each field type", "separate columns per field"]
  - id: manual-updatedAt
    choice: "Manual updatedAt timestamp field instead of using _creationTime"
    rationale: "Allows distinguishing between creation and last update time"
    alternatives: ["rely on _creationTime only", "compute from activity_history"]
  - id: gitignore-env-local
    choice: "Track .env.local in git for Convex deployment URL"
    rationale: "Convex URL is not sensitive, needed for team collaboration"
    alternatives: ["gitignore and document separately", "use environment-specific files"]
metrics:
  duration: "1.3 minutes"
  tasks_completed: 2
  commits: 2
  files_created: 4
  files_modified: 2
completed: 2026-02-02
---

# Phase 1 Plan 01: Initialize Convex Backend Summary

**One-liner:** Convex project initialized with task management schema (status/priority/tags) and activity history tracking using union literal validators.

## What Was Built

### Convex Deployment
- Initialized Convex project with cloud deployment: `precise-monitor-542.convex.cloud`
- Installed convex v1.31.7
- Generated type definitions in `convex/_generated/`
- Configured `.env.local` with deployment URL (tracked in git)

### Tasks Table Schema
Defined complete task schema with:
- **Core fields:** title (string), description (optional string)
- **Status management:** status enum (backlog/in_progress/blocked/done) using union literals
- **Prioritization:** priority enum (low/medium/high/urgent) using union literals
- **Organization:** tags (array of strings), order (number for drag-drop)
- **Lifecycle:** archived (boolean for soft delete), updatedAt (timestamp)
- **Indexes:**
  - `by_status_order`: Compound index for efficient column queries with ordering
  - `by_priority`: Single-field index for priority filtering
  - `by_dueDate`: Single-field index for date-based queries
  - `by_archived`: Single-field index for filtering archived tasks

### Activity History Table
Defined change tracking schema with:
- **Task reference:** taskId (foreign key to tasks table)
- **Change details:** field (string), oldValue/newValue (JSON strings)
- **User tracking:** userId (optional, for Phase 3 auth)
- **Automatic timestamp:** _creationTime (Convex built-in)
- **Indexes:**
  - `by_task`: Efficient queries for task-specific history

## Technical Implementation

### Schema Validation Pattern
Used Convex-idiomatic union literal approach for enums:
```typescript
export const statusValidator = v.union(
  v.literal("backlog"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("done")
);
```
This provides compile-time type safety and runtime validation without string/number magic values.

### Flexible Activity Tracking
Activity history stores old/new values as JSON strings rather than typed fields. This allows:
- Any field type to be tracked without schema changes
- Easy evolution as new fields are added to tasks table
- Simple serialization for complex values (arrays, nested objects)

### Index Design
Compound index `by_status_order` enables efficient queries for:
- All tasks in a status column (e.g., "in_progress")
- Sorted by order field for drag-drop positioning
- Single query without client-side sorting

Single-field indexes support filtering workflows (by priority, due date, archived state).

## Decisions Made

**1. Enum Representation**
- **Choice:** Union literals via v.union(v.literal(...))
- **Why:** Type-safe, validated by Convex, generates proper TypeScript types
- **Impact:** Better DX, impossible to pass invalid status/priority values

**2. Activity History Flexibility**
- **Choice:** JSON stringified old/new values
- **Why:** Schema-agnostic, handles any field type without migration
- **Impact:** Easier to add new tracked fields in future phases

**3. Manual vs Automatic Timestamps**
- **Choice:** Explicit updatedAt field
- **Why:** Need to distinguish creation (_creationTime) from last modification
- **Impact:** Can query "recently updated" independent of creation date

**4. .env.local in Git**
- **Choice:** Track .env.local despite typical gitignore practice
- **Why:** Convex URL is not sensitive, team needs it for dev
- **Impact:** No setup friction for new developers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed explicit _creationTime index**
- **Found during:** Task 2 schema push
- **Issue:** Convex returned 400 error: "_creationTime is automatically added to the end of each index"
- **Fix:** Removed `.index("by_creation", ["_creationTime"])` from activity_history table
- **Files modified:** convex/schema.ts
- **Commit:** 3cea9cd (included in Task 2 commit)
- **Rationale:** Convex automatically indexes _creationTime, explicit declaration is redundant and causes deployment failure

## Verification Performed

### Task 1 Verification
- ✅ `ls convex/_generated/` shows 7 generated files (api.d.ts, dataModel.d.ts, server.d.ts, etc.)
- ✅ `cat .env.local` contains `CONVEX_URL=https://precise-monitor-542.convex.cloud`
- ✅ `grep convex package.json` shows convex v1.31.7 dependency

### Task 2 Verification
- ✅ `npx convex dev --once` completed with "Convex functions ready!" (no schema errors)
- ✅ convex/schema.ts contains tasks table with 9 fields and 4 indexes
- ✅ convex/schema.ts contains activity_history table with 5 fields and 1 index
- ✅ convex/_generated/dataModel.d.ts regenerated with new schema types

### Overall Success Criteria
- ✅ Convex installed as dependency in package.json
- ✅ .env.local contains valid CONVEX_URL
- ✅ convex/schema.ts defines tasks table with all CONTEXT.md fields
- ✅ convex/schema.ts defines activity_history table with change tracking
- ✅ Schema pushed to Convex cloud (deployment successful)
- ✅ Type definitions generated in convex/_generated/

## Files Modified

### Created
- `convex/schema.ts` (48 lines): Complete schema definition
- `.env.local` (7 lines): Convex deployment configuration
- `convex/_generated/api.d.ts`: Generated API types
- `convex/_generated/dataModel.d.ts`: Generated data model types
- `convex/_generated/server.d.ts`: Generated server types
- `convex/_generated/api.js`: Generated API runtime
- `convex/_generated/server.js`: Generated server runtime
- `convex/README.md`: Convex documentation
- `convex/tsconfig.json`: TypeScript config for Convex functions
- `package-lock.json`: Dependency lock file

### Modified
- `package.json`: Added convex ^1.31.7 to dependencies
- `.gitignore`: Updated to track .env.local and ignore node_modules

## Performance Metrics

- **Execution time:** 1.3 minutes (76 seconds)
- **Tasks completed:** 2/2 (100%)
- **Commits created:** 2 atomic commits
- **Files created:** 10 files (4 source + 6 generated)
- **Files modified:** 2 files
- **Schema deployment:** Successful on first attempt (after index fix)

## Next Phase Readiness

### Provides for 01-02 (CRUD Mutations)
- ✅ `convex/schema.ts` exports statusValidator and priorityValidator for reuse
- ✅ Tasks table schema ready for insert/update/delete operations
- ✅ Activity_history table ready for change logging
- ✅ Type definitions in `convex/_generated/api.d.ts` for type-safe function signatures

### Provides for 01-03 (Query Functions)
- ✅ Indexes optimized for common query patterns:
  - by_status_order for Kanban column rendering
  - by_priority for filtering workflows
  - by_dueDate for timeline views
  - by_archived for active/archived toggle

### Blockers/Concerns
- None. Schema is complete and deployed.

### Dependencies for Future Phases
- **Phase 2 (Kanban UI):** Will read tasks using query functions (01-03)
- **Phase 3 (Auth):** Will populate userId field in activity_history
- **Phase 4 (MCP):** Will use CRUD mutations (01-02) for task management

## Lessons Learned

### What Went Well
- Convex initialization was straightforward with `npx convex dev`
- Union literal validators provide excellent type safety
- Generated types immediately available after schema push
- Index error message was clear and easy to fix

### What Could Be Improved
- Could have caught the _creationTime index issue by reading Convex docs first
- Activity history JSON stringification might complicate querying (but acceptable tradeoff for flexibility)

### Pattern to Reuse
- Union literal validators for any enum-like fields
- Soft delete (archived flag) instead of hard delete
- Separate activity/audit table with JSON flexibility

## Assistant Handoff Context

### For Next Plan (01-02 CRUD Mutations)
You now have:
- Complete tasks table schema in `convex/schema.ts`
- Validators exported for reuse: `statusValidator`, `priorityValidator`
- Type-safe IDs: Use `Id<"tasks">` from `convex/_generated/dataModel`
- Activity tracking: Log changes to `activity_history` table with JSON.stringify()

### Key Implementation Notes
- Always use exported validators in mutation arguments (don't redefine)
- Remember updatedAt is manual - set to Date.now() on every update
- Activity history requires taskId: v.id("tasks") reference
- Archived tasks should stay in query results unless explicitly filtered

### Testing Strategy for 01-02
- Test with all 4 status values (backlog/in_progress/blocked/done)
- Test with all 4 priority values (low/medium/high/urgent)
- Test tags as empty array and multiple tags
- Test archived true/false behavior
- Verify activity_history entries created on updates

---

**Generated:** 2026-02-02
**Commits:** bbd17a2, 3cea9cd
**Duration:** 1.3 minutes
