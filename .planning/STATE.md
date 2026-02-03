# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Personal task visibility for both human and AI assistant
**Current focus:** v1.1 Authentication & Assistant Integration

## Current Position

Phase: 5 of 5 (Migration)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-03 - Completed 05-01-PLAN.md

Progress: [█████████░] 90% (18/20 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: 2.6 minutes
- Total execution time: 0.78 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 (Convex Backend) | 2 | 4.0m | 2.0m |
| 02 (React Frontend) | 7 | 21.0m | 3.0m |
| 03 (Authentication) | 4 | 10.0m | 2.5m |
| 04 (MCP Integration) | 5 | 13.5m | 2.7m |
| 05 (Migration) | 1 | 1.4m | 1.4m |

**Recent Trend:**
- Last 5 plans: 04-01 (4.8m), 04-02 (2.7m), 04-04 (3.0m), 04-05 (3.0m), 05-01 (1.4m)
- Trend: Steady velocity

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Convex over Vercel KV/Postgres: Unified auth + database + realtime
- Google OAuth only: Simpler than multi-provider
- React conversion: Required for Convex Auth hooks
- MCP for assistant: Claude Code native, local execution
- **[01-01]** Enum as union literals: v.union(v.literal(...)) for type safety (affects schema patterns)
- **[01-01]** Activity history JSON strings: Flexible tracking for any field type (affects audit queries)
- **[01-01]** Track .env.local in git: Convex URL needed for team collaboration (affects repo setup)
- **[01-02]** Empty title validation: throw error instead of silent trim (affects data quality)
- **[01-02]** Restore to backlog: restored tasks always go to backlog status (affects UX flow)
- **[01-02]** CLI verification over manual: programmatic testing for autonomous execution (affects test strategy)
- **[02-01]** ESLint ignores convex/ folder: backend code linted separately (affects lint config)
- **[02-01]** VITE_CONVEX_URL in .env.local: Vite requires VITE_ prefix for client-side env vars
- **[02-02]** clsx for conditional classnames: lightweight, type-safe alternative to classnames
- **[02-02]** memo on TaskCard: prevents re-renders when sibling tasks change
- **[02-02]** Feature folder structure: component + module.css + skeleton + index barrel
- **[02-03]** dnd-kit for drag-drop: actively maintained, excellent TypeScript support
- **[02-03]** Optimistic updates only for status: other mutations wait for server confirmation
- **[02-03]** useTaskMutations hook: centralized mutation handling pattern
- **[02-04]** Modal state lifted to App: cross-component access for add/edit task
- **[02-04]** Delete uses archiveTask: soft delete pattern from Phase 1
- **[02-05]** Tag filter OR logic: multiple selected tags use OR (any matching tag passes)
- **[02-05]** Combined filter logic: search AND any-tag
- **[02-05]** Board props pattern: Board receives filtered tasks from parent
- **[02-06]** Sonner for toasts: lightweight, dark theme support, bottom-right position
- **[02-06]** Sliding panel pattern: overlay + panel with .active class toggle
- **[02-06]** Activity actions formatted: Created, Moved, Updated, Archived, Restored
- **[02-07]** react-hotkeys-hook for keyboard shortcuts: simple API, handles mod key cross-platform
- **[02-07]** Auto-archive uses updatedAt: proxy for completion time when task moved to done
- **[02-07]** processedRef pattern: prevents duplicate archive calls in effect
- **[03-01]** userId optional on tasks: for migration compatibility with existing data
- **[03-01]** @auth/core pinned to ~0.37.3: for @convex-dev/auth compatibility
- **[03-01]** 30-day session duration: per CONTEXT.md personal use case
- **[03-02]** Auth validation order: check auth before task existence for consistent errors
- **[03-02]** Ownership validation pattern: getAuthUserId + userId comparison on all mutations
- **[03-03]** Auth components from convex/react: Authenticated/Unauthenticated/AuthLoading exported from convex/react, not @convex-dev/auth/react
- **[03-03]** BoardContent extraction pattern: board logic moved to separate component for clean auth conditional rendering
- **[03-04]** Avatar onError fallback: handles Firefox image load failures with initials placeholder
- **[03-04]** referrerPolicy no-referrer on avatar: prevents referrer-based blocking of Google profile images
- **[04-01]** Internal functions pattern: mcpApi.ts has own internal functions accepting userId param (separate from session auth in tasks.ts)
- **[04-01]** Board summary includes task titles: more useful for AI assistant context
- **[04-01]** Delete vs archive separation: deleteTask permanent removal, archiveTask soft delete per CONTEXT.md
- **[04-02]** Fetch wrapper over ConvexHttpClient: plain fetch with callMcpApi instead of importing convex package
- **[04-02]** Stderr-only logging: console.error only, no console.log (stdio transport uses stdout for JSON-RPC)
- **[04-02]** Tool registration pattern: registerReadTools(server) pattern for Plan 03 to follow with registerWriteTools
- **[04-04]** Separate tsconfig.mcp.json (not extending main): NodeNext vs bundler moduleResolution are incompatible
- **[04-04]** Non-empty token placeholder: "set-your-token-here" passes env check, gives meaningful 401 instead of startup crash
- **[04-05]** Status filter AND logic: status filter combines with text, priority, tags, dueDate using AND
- **[05-01]** Empty tags array for missing tag: safer than assuming default "project" tag

### Pending Todos

None yet.

### Blockers/Concerns

- MCP_API_TOKEN and MCP_USER_ID environment variables must be set in Convex dashboard before testing MCP endpoints
- CONVEX_SITE_URL and MCP_API_TOKEN must be set as environment variables when running the MCP server

## Session Continuity

Last session: 2026-02-03 10:07 PST
Stopped at: Completed 05-01-PLAN.md
Resume file: None
Next up: Phase 5 (Migration) - 05-02-PLAN.md
