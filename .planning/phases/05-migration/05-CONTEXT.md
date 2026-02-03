# Phase 5: Migration - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate existing localStorage task data to Convex on first authenticated login. One-time migration flow with auto-detection, import, and cleanup. Creating new migration paths for future schema changes is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Migration trigger & prompt
- Auto-detect on login: if localStorage has task data when user authenticates, show migration prompt automatically
- Modal dialog with explanation and migrate/skip buttons
- Show task count only in preview ("Found 12 tasks in your browser")
- One chance only: if user skips, prompt never returns
- Set a localStorage flag after migration or skip to prevent re-prompting

### Data mapping & conflicts
- Preserve original timestamps (createdAt, updatedAt) from localStorage
- Create a single "Migrated from local storage" activity history entry per imported task
- Import active tasks only — skip archived/soft-deleted tasks from localStorage
- Strict schema matching: only import if localStorage data matches the expected v1.0 format exactly

### Post-migration cleanup
- Clear localStorage task data immediately after successful migration
- Success toast notification: "Imported 12 tasks successfully" — then straight to the board
- Show progress indicator during import: "Importing task 3 of 12..."
- No undo/rollback — migration is final

### Failure & edge cases
- Partial failure: keep successfully imported tasks, report which ones failed
- Malformed data: skip silently, import what's valid, mention skipped count in toast ("Imported 10 of 12 tasks")
- Empty localStorage: show brief "No local data found" note before proceeding to board
- No dedup logic needed — user is unlikely to have created Convex tasks before migration

### Claude's Discretion
- Whether to import when Convex already has tasks (conflict strategy)
- Modal dialog styling and copy
- localStorage key names to scan for task data
- How to validate the v1.0 schema format
- Progress indicator implementation (inline in modal vs separate)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-migration*
*Context gathered: 2026-02-03*
