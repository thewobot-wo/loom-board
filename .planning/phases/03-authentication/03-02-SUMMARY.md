---
phase: 03-authentication
plan: 02
subsystem: backend-security
tags: [convex, auth, authorization, ownership]

dependency-graph:
  requires: [03-01]
  provides: [auth-protected-task-crud]
  affects: [03-03, 03-04]

tech-stack:
  added: []
  patterns:
    - getAuthUserId pattern for all handlers
    - ownership validation pattern
    - by_user index filtering

key-files:
  created: []
  modified:
    - convex/tasks.ts

decisions:
  - id: ownership-validation-order
    choice: validate auth before task existence
    reason: consistent error messaging and fail-fast approach

metrics:
  duration: 2m
  completed: 2026-02-02
---

# Phase 03 Plan 02: Task Function Protection Summary

**One-liner:** All task queries/mutations now require authentication and validate user ownership via getAuthUserId pattern

## What Was Built

### Task 1: Auth Validation for Query Functions

Added authentication and user filtering to all 4 query functions:

- **getTask**: Validates authentication, checks task exists, validates ownership
- **listTasks**: Filters by authenticated user's tasks using by_user index
- **listTasksByStatus**: Filters by user first (indexed), then by status/archived
- **listArchivedTasks**: Filters by authenticated user's archived tasks

All queries now:
1. Call `getAuthUserId(ctx)` to get current user
2. Throw "Not authenticated" if userId is null
3. Filter/validate by userId using the by_user index

### Task 2: Auth Validation for Mutation Functions

Added authentication and ownership validation to all 4 mutation functions:

- **createTask**: Validates auth, auto-assigns userId to new tasks
- **updateTask**: Validates auth and ownership before allowing updates
- **archiveTask**: Validates auth and ownership before archiving
- **restoreTask**: Validates auth and ownership before restoring

All mutations now:
1. Call `getAuthUserId(ctx)` to get current user
2. Throw "Not authenticated" if userId is null
3. For existing tasks: throw "Not authorized" if task.userId !== userId
4. Activity history entries include real userId (as string)

## Key Implementation Details

### Authentication Pattern

```typescript
const userId = await getAuthUserId(ctx);
if (!userId) throw new Error("Not authenticated");
```

### Ownership Validation Pattern

```typescript
const task = await ctx.db.get(args.id);
if (!task) throw new Error("Task not found");
if (task.userId !== userId) throw new Error("Not authorized");
```

### User-Scoped Query Pattern

```typescript
return await ctx.db
  .query("tasks")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .filter((q) => q.eq(q.field("archived"), false))
  .collect();
```

## Verification Results

- `npx convex dev --once` compiles successfully
- `getAuthUserId` appears in all 8 handler functions
- "Not authenticated" appears in all 8 functions
- "Not authorized" appears in 4 functions (get/update/archive/restore)
- createTask includes userId in insert object
- All activity_history inserts use `userId: userId.toString()`

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth validation order | Check auth before task existence | Consistent error messaging, fail-fast approach |
| Error message format | "Not authenticated" / "Not authorized" | Clear distinction between auth and authz errors |
| userId in activity_history | `userId.toString()` | Schema expects string, Convex Id needs conversion |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 2c5457e | feat | Add auth validation to all query functions |
| ba455de | feat | Add auth validation to all mutation functions |

## Next Phase Readiness

**Ready for 03-03 (Auth Frontend Integration)**:
- All backend functions now require authentication
- Frontend will need to handle "Not authenticated" errors by showing login
- Frontend will need ConvexProviderWithAuth for auth state management

**Blockers/Concerns:**
- None identified
