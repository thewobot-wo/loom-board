# Phase 1: Convex Backend - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema and CRUD functions for task management. Working Convex backend with task schema and CRUD functions testable via dashboard. Frontend integration, authentication, and MCP tools are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Task Schema Fields
- `title` — required, non-empty string
- `description` — optional, can be null/empty
- `status` — Claude's discretion on enum approach (must support 4 columns: backlog, in_progress, blocked, done)
- `priority` — named levels: low, medium, high, urgent
- `tags` — array of strings (multiple tags per task)
- `dueDate` — optional timestamp
- `createdAt`, `updatedAt` — automatic timestamps
- `order` — numeric field for manual reordering within columns

### Activity History Design
- Track ALL field changes (not just status)
- Store old and new values for each change ("priority changed from low to high")
- Include `userId` field to track who made the change (will be populated once auth exists)
- Retain history for 90 days

### CRUD Function Responses
- Create: return full task object with all fields
- Update: accept partial updates (only change provided fields)
- Validation: strict — reject invalid data with descriptive error messages
- Errors: throw with message (Convex-idiomatic approach)

### Data Organization
- Separate tables: `tasks` and `activity_history` (history references task)
- Index all filterable fields: status, priority, dueDate, tags
- Soft delete: use archived/deleted flag, filter out in queries
- Order field: enable manual reordering within columns via drag-and-drop

### Claude's Discretion
- Exact status enum implementation (Convex validator vs string union)
- Index composition and naming
- History cleanup implementation (cron job timing, batch size)
- How to handle order field gaps/rebalancing

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard Convex patterns and best practices.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-convex-backend*
*Context gathered: 2026-02-02*
