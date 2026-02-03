---
phase: 04-mcp-integration
plan: 04
subsystem: mcp
tags: [mcp, typescript, nodenext, restructure, tsconfig]

# Dependency graph
requires:
  - phase: 04-mcp-integration (plans 01-03)
    provides: MCP server source files and Convex HTTP API endpoints
provides:
  - MCP server at src/mcp/ (consolidated into main package)
  - Shared dependencies via root package.json
  - Separate tsconfig.mcp.json for Node.js MCP compilation
  - Working .mcp.json with correct path and non-empty token placeholder
affects: [04-05 (search filter plan), future MCP maintenance]

# Tech tracking
tech-stack:
  added: ["@modelcontextprotocol/sdk ^1.25.0 (moved to root)", "zod ^3.25.0 (explicit)", "tsx ^4.19.0 (moved to root)"]
  patterns: ["Separate tsconfig for Node.js subsystem within frontend project", "Main tsconfig exclude for incompatible module resolution"]

key-files:
  created: [src/mcp/index.ts, src/mcp/convex-client.ts, src/mcp/tools/read.ts, src/mcp/tools/write.ts, tsconfig.mcp.json]
  modified: [package.json, tsconfig.json, .mcp.json]

key-decisions:
  - "Separate tsconfig.mcp.json (not extending main): NodeNext vs bundler moduleResolution are incompatible"
  - "Non-empty token placeholder: 'set-your-token-here' passes env check, gives meaningful 401 instead of startup crash"

patterns-established:
  - "tsconfig isolation: src/mcp/ excluded from main tsconfig, has own tsconfig.mcp.json"
  - "Shared deps: MCP server uses root node_modules, no separate package.json"

# Metrics
duration: 3min
completed: 2026-02-03
---

# Phase 4 Plan 4: MCP Restructure Summary

**Consolidated MCP server from mcp-server/ sub-project into src/mcp/ with shared deps, separate tsconfig.mcp.json, and fixed token placeholder**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-03T17:06:09Z
- **Completed:** 2026-02-03T17:09:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Moved all 4 MCP source files from mcp-server/src/ to src/mcp/ preserving NodeNext .js import paths
- Consolidated dependencies (@modelcontextprotocol/sdk, zod, tsx) into root package.json, eliminating separate sub-project
- Created tsconfig.mcp.json with NodeNext module resolution for Node.js MCP execution
- Fixed .mcp.json: updated path to src/mcp/index.ts and set non-empty token placeholder preventing startup crashes
- Excluded src/mcp/ from main tsconfig.json to prevent bundler/NodeNext module resolution conflict

## Task Commits

Each task was committed atomically:

1. **Task 1: Move MCP source files and update dependencies** - `3dd2679` (refactor)
2. **Task 2: Update .mcp.json path and fix token placeholder** - `45234e1` (fix)

## Files Created/Modified
- `src/mcp/index.ts` - MCP server entry point with stdio transport
- `src/mcp/convex-client.ts` - Fetch wrapper for Convex HTTP action endpoints
- `src/mcp/tools/read.ts` - Read tool registrations (list, get, search, summary)
- `src/mcp/tools/write.ts` - Write tool registrations (create, update, move, delete, archive)
- `tsconfig.mcp.json` - Separate Node.js TypeScript config for MCP server
- `package.json` - Added MCP deps to root (modelcontextprotocol/sdk, zod, tsx)
- `tsconfig.json` - Added exclude for src/mcp/
- `.mcp.json` - Updated path and token placeholder
- `mcp-server/` - Deleted entirely (package.json, tsconfig.json, all source files)

## Decisions Made
- **Separate tsconfig (not extending main):** NodeNext module resolution is incompatible with bundler resolution; extending would cause conflicts
- **Non-empty token placeholder:** "set-your-token-here" passes the env var check in convex-client.ts, giving users a meaningful 401 from Convex instead of a cryptic startup crash about missing MCP_API_TOKEN

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. Users must replace "set-your-token-here" in .mcp.json with their actual MCP API token (existing requirement, not new).

## Next Phase Readiness
- MCP server code is now properly integrated into the main project
- Both type-checking configs pass: `npx tsc --noEmit` and `npx tsc --project tsconfig.mcp.json --noEmit`
- MCP server starts successfully with `npx tsx src/mcp/index.ts`
- Ready for 04-05 plan (search filter improvements)

---
*Phase: 04-mcp-integration*
*Completed: 2026-02-03*
