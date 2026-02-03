---
phase: 04-mcp-integration
plan: 02
subsystem: mcp-server
tags: [mcp, typescript, node, stdio-transport, read-tools]
dependency_graph:
  requires: [04-01]
  provides: [mcp-server-scaffold, read-tools]
  affects: [04-03]
tech_stack:
  added: ["@modelcontextprotocol/sdk", "tsx"]
  patterns: [stdio-transport, fetch-wrapper-with-retry, zod-tool-schemas, tool-registration-pattern]
key_files:
  created:
    - mcp-server/package.json
    - mcp-server/tsconfig.json
    - mcp-server/src/index.ts
    - mcp-server/src/convex-client.ts
    - mcp-server/src/tools/read.ts
  modified: []
decisions:
  - id: fetch-wrapper-over-convex-client
    choice: "Plain fetch wrapper (callMcpApi) instead of ConvexHttpClient"
    reason: "MCP API uses HTTP actions, so fetch is cleaner and avoids pulling full Convex client dependency"
  - id: retry-on-network-only
    choice: "Retry up to 2 times on network/server errors, not on 4xx client errors"
    reason: "Client errors (bad input, unauthorized) should fail immediately; network issues may be transient"
  - id: stderr-only-logging
    choice: "All diagnostic output via console.error, no console.log"
    reason: "Stdio transport uses stdout for JSON-RPC; any console.log would corrupt the protocol"
  - id: text-formatted-tool-output
    choice: "Human-readable markdown-like text for all tool responses"
    reason: "Claude reads tool output as text; structured formatting with headers and labels aids comprehension"
metrics:
  duration: "2.7m"
  completed: "2026-02-03"
---

# Phase 04 Plan 02: MCP Server with Read Tools Summary

**Node.js MCP server sub-project with stdio transport, fetch-based Convex API wrapper, and 4 read-only tools for board visibility**

## What Was Built

### Task 1: MCP Server Scaffold

**mcp-server/package.json:**
- ESM module type, private package
- Dependencies: @modelcontextprotocol/sdk, zod
- Dev dependencies: @types/node, tsx, typescript
- Scripts: build (tsc), start (node), dev (tsx)

**mcp-server/tsconfig.json:**
- Target ES2022, NodeNext module resolution
- Strict mode, source maps, declarations
- Output to ./build, source from ./src

**mcp-server/src/convex-client.ts:**
- Reads CONVEX_SITE_URL and MCP_API_TOKEN from environment
- Validates both at module load time with clear error messages
- `callMcpApi(path, options?)` function:
  - Constructs full URL from CONVEX_SITE_URL + path
  - Sets Authorization Bearer header and Content-Type
  - Retry logic: up to 2 retries on network/server errors with 1s delay
  - No retry on 4xx client errors (fail immediately)
  - Parses JSON response, throws on error with server message

**mcp-server/src/index.ts:**
- Creates McpServer instance (name: "loom-board", version: "1.0.0")
- Imports and calls registerReadTools(server)
- Connects via StdioServerTransport
- Global error handlers for uncaughtException and unhandledRejection
- All logging via console.error (stderr)

### Task 2: Read-Only MCP Tools

**mcp-server/src/tools/read.ts** (277 lines):

4 tools registered using `server.tool(name, description, schema, handler)`:

1. **list_tasks** -- No parameters. GET /mcp/tasks. Returns tasks grouped by status columns (Backlog, In Progress, Blocked, Done) with priority, due date, and tags.

2. **get_task** -- `{ id: string }`. GET /mcp/tasks/get?id={id}. Returns full task detail: title, ID, status, priority, description, tags, due date, created/updated timestamps.

3. **search_tasks** -- Complex schema with optional text, priority enum, tags array, and dueDate union (named presets or custom date range). POST /mcp/tasks/search. Returns flat list of matching tasks with count.

4. **get_board_summary** -- No parameters. POST /mcp/board/summary. Returns total count, per-column counts, and overdue task listing.

All tools:
- Use Zod schemas for input validation
- Return `{ content: [{ type: "text", text }] }` for success
- Return `{ content: [{ type: "text", text }], isError: true }` for errors
- Format output as human-readable markdown-like text

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript compilation (tsc --noEmit) | Passes with no errors |
| Tool count in read.ts | 4 tools (server.tool called 4 times) |
| convex-client.ts env vars | CONVEX_SITE_URL and MCP_API_TOKEN validated |
| convex-client.ts retry logic | 2 retries on network errors, no retry on 4xx |
| index.ts server setup | McpServer + StdioServerTransport |
| No console.log in src/ | Zero occurrences (only console.error) |
| read.ts line count | 277 lines (exceeds 80 minimum) |

## Decisions Made

1. **Fetch wrapper over ConvexHttpClient**: Used plain fetch with callMcpApi wrapper instead of importing the convex package's ConvexHttpClient. The MCP API endpoints are plain HTTP actions, so a simple fetch wrapper is lighter and avoids the full Convex client dependency in the MCP server sub-project.

2. **Retry on network errors only**: The retry logic (up to 2 retries with 1s delay) only activates on network/server errors. Client errors (4xx) fail immediately since retrying bad input or auth issues is pointless.

3. **Stderr-only logging**: All diagnostic output uses console.error. The stdio transport uses stdout for JSON-RPC communication, so any console.log would corrupt the protocol stream.

4. **Text-formatted tool output**: All tool responses are formatted as human-readable markdown-like text with headers, labels, and structured layout. Claude reads these as text, so clear formatting with `[PRIORITY]`, status grouping, and labeled fields aids comprehension.

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 20732e7 | Scaffold MCP server sub-project with ConvexHttpClient |
| 2 | 21398dc | Implement read-only MCP tools |

## Next Phase Readiness

- MCP server scaffold is complete and compiles cleanly
- Plan 03 will add write tools (create_task, update_task, move_task, delete_task, archive_task) following the same registration pattern established here
- The `registerReadTools` pattern provides a template: Plan 03 creates `tools/write.ts` with `registerWriteTools`
- Environment variables (CONVEX_SITE_URL, MCP_API_TOKEN) will need to be set when running the server
