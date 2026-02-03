# Phase 4: MCP Integration - Context

**Gathered:** 2026-02-02 (updated 2026-02-03)
**Status:** Ready for planning

<domain>
## Phase Boundary

Expose Loom Board task operations as MCP tools so Claude Code can read, write, search, and summarize tasks programmatically. Covers 8 tools: list_tasks, get_task, create_task, update_task, move_task, delete_task, search_tasks, get_board_summary. The MCP server authenticates via API token tied to a single user.

</domain>

<decisions>
## Implementation Decisions

### Tool response format
- list_tasks returns full fields on every task (ID, title, description, status, priority, tags, dates, timestamps)
- Date fields returned in human-readable format (e.g. "Feb 3, 2026")
- Claude's Discretion: get_board_summary structure (counts only vs counts + task titles)
- Claude's Discretion: whether mutation tools (create/update) return full task or confirmation

### Error behavior
- Claude's Discretion: error message format and helpfulness level for not-found/invalid-input cases
- Claude's Discretion: validation strictness on create_task (strict vs lenient with defaults)
- Network failures: retry 2-3 times automatically, then return error if still failing
- delete_task and archive_task are separate tools — archive uses existing soft delete pattern, delete is permanent removal

### Search & filtering
- Filters combine with AND logic (all filters must match)
- Text search matches across title + description
- Due date filtering supports both named presets (overdue, due-today, due-this-week, no-due-date) AND custom date range params (dueAfter/dueBefore)
- No result limits — always return all matching tasks (personal board scale)

### Auth & identity
- MCP server authenticates via personal API token (generated, scoped to user account)
- Single-user mode — token is tied to the board owner, all operations are that user's tasks
- Token is permanent until manually revoked (no auto-expiry)
- Claude's Discretion: MCP server architecture (local Node.js process vs Convex HTTP actions vs other)

### MCP config & server setup
- .mcp.json lives in project root — tools available when working in this project
- .mcp.json committed to git — anyone cloning gets the config, but needs their own env vars
- Credentials (API token, Convex URL) passed via environment variables referenced in .mcp.json
- MCP server code lives in the same package (not a separate sub-directory or npm package) — shares dependencies with the app

### Claude's Discretion
- MCP server runtime architecture
- get_board_summary detail level
- Mutation response payloads (full task vs confirmation)
- Error message format and validation strictness
- Exact retry strategy on network failures

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for MCP server implementation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-mcp-integration*
*Context gathered: 2026-02-02 (updated 2026-02-03)*
