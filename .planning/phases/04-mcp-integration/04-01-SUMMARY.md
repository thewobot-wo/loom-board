---
phase: 04-mcp-integration
plan: 01
subsystem: backend-api
tags: [convex, http-actions, mcp, authentication, api]
dependency_graph:
  requires: [03-02]
  provides: [mcp-http-api, token-auth-endpoints]
  affects: [04-02, 04-03]
tech_stack:
  added: []
  patterns: [httpAction-with-internal-functions, token-bearer-auth, env-var-user-resolution]
key_files:
  created:
    - convex/mcpApi.ts
  modified:
    - convex/http.ts
decisions:
  - id: internal-functions-pattern
    choice: "Internal query/mutation functions in mcpApi.ts instead of modifying tasks.ts"
    reason: "Existing tasks.ts uses getAuthUserId (session auth); MCP needs userId-param-based auth"
  - id: cors-preflight-handler
    choice: "Shared httpAction CORS handler for all OPTIONS routes"
    reason: "DRY pattern for preflight responses across all 9 endpoints"
  - id: board-summary-detail
    choice: "Include task titles and priorities in board summary columns"
    reason: "Per CONTEXT.md Claude's Discretion -- more useful for AI assistant context"
  - id: delete-vs-archive-separation
    choice: "Separate delete (permanent) and archive (soft) endpoints per CONTEXT.md"
    reason: "delete_task permanently removes; archive_task sets archived:true"
  - id: search-dueDate-flexibility
    choice: "dueDate accepts both string presets and object date ranges"
    reason: "Per CONTEXT.md -- named presets (overdue, due-today, due-this-week, no-due-date) AND custom dueAfter/dueBefore"
metrics:
  duration: "4.8m"
  completed: "2026-02-03"
---

# Phase 04 Plan 01: MCP HTTP API Endpoints Summary

**Convex HTTP actions with Bearer token auth for all 9 MCP operations, using internal functions to bypass session auth**

## What Was Built

### Task 1: MCP API HTTP Actions (convex/mcpApi.ts)

Created 711-line file with:

**Helper functions:**
- `validateToken(request)` -- extracts Bearer token from Authorization header, validates against `MCP_API_TOKEN` env var, resolves user from `MCP_USER_ID`
- `jsonResponse(data, status)` -- consistent JSON responses with CORS headers
- `errorResponse(message, status)` -- error response wrapper
- `formatDate(timestamp)` -- human-readable dates via `Intl.DateTimeFormat`
- `formatTask(task)` -- transforms Convex document to API response format with formatted dates

**7 internal functions** (accept userId as parameter, called by HTTP actions):
- `listTasksInternal` -- query non-archived tasks by user index
- `getTaskInternal` -- get single task with ownership validation
- `createTaskInternal` -- create with auto-calculated order, activity logging
- `updateTaskInternal` -- partial update with per-field activity history tracking
- `deleteTaskInternal` -- permanent delete with activity history cleanup
- `archiveTaskInternal` -- soft delete with activity logging
- `searchTasksInternal` -- multi-filter search (text, priority, tags, dueDate presets/ranges)

**9 HTTP action handlers:**
1. `listTasks` (GET) -- all non-archived tasks with formatted dates
2. `getTask` (GET) -- single task by ?id= query param
3. `createTask` (POST) -- defaults: status=backlog, priority=medium, tags=[]
4. `updateTask` (POST) -- partial updates with validation
5. `moveTask` (POST) -- shortcut for status change
6. `deleteTask` (POST) -- permanent removal
7. `archiveTask` (POST) -- soft delete
8. `searchTasks` (POST) -- text/priority/tags/dueDate filters with AND logic
9. `getBoardSummary` (POST) -- column counts, task details, overdue tracking

### Task 2: HTTP Route Registration (convex/http.ts)

- 9 MCP routes under `/mcp/*` paths
- 9 CORS preflight (OPTIONS) handlers
- Shared `corsPreflightHandler` httpAction
- Existing auth routes preserved

## Verification Results

| Check | Result |
|-------|--------|
| Convex deployment | Succeeds without errors |
| Route count | 9 MCP routes + 9 OPTIONS handlers |
| Token validation | Consistent across all 9 handlers |
| Date formatting | Intl.DateTimeFormat for human readability |
| Error responses | 400/401/403/404/500 with descriptive messages |
| File size | 711 lines (exceeds 150 minimum) |

## Decisions Made

1. **Internal functions pattern**: Created dedicated internal query/mutation functions in mcpApi.ts that accept userId as a parameter, rather than modifying existing tasks.ts functions that use session-based getAuthUserId. This keeps the session-auth and token-auth paths cleanly separated.

2. **Board summary detail level**: Included task titles and priorities in the column breakdown (not just counts). More useful for Claude Code to understand board state at a glance.

3. **Delete vs archive as separate operations**: Per CONTEXT.md, deleteTask permanently removes from database (including activity history cleanup), while archiveTask sets archived:true.

4. **Search dueDate flexibility**: Supports both named preset strings ("overdue", "due-today", "due-this-week", "no-due-date") and object format `{ dueAfter, dueBefore }` with ISO date strings.

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b7ac6df | MCP API HTTP actions with token authentication |
| 2 | f2fb42c | Register MCP HTTP routes in Convex router |

## Next Phase Readiness

- MCP HTTP endpoints are deployed and ready for Plan 02 (MCP Server) to call via ConvexHttpClient
- Environment variables MCP_API_TOKEN and MCP_USER_ID must be set in Convex dashboard before testing
- All 9 operations map directly to the MCP tools specified in CONTEXT.md
