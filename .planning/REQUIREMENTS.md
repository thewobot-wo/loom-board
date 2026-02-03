# Requirements: Loom Board v1.1

**Defined:** 2026-02-02
**Core Value:** Personal task visibility for both human and AI assistant

## v1.1 Requirements

Requirements for Authentication & Assistant Integration milestone. Each maps to roadmap phases.

### React Conversion

- [x] **REACT-01**: App converted from vanilla HTML/CSS/JS to React
- [x] **REACT-02**: All existing UI functionality preserved (4-column board, drag-drop, search, filters)
- [x] **REACT-03**: All existing features working (activity history, auto-archive, toasts, keyboard shortcuts)

### Authentication

- [x] **AUTH-01**: User can sign in with Google account via Convex Auth
- [x] **AUTH-02**: User session persists across browser refresh
- [x] **AUTH-03**: User can sign out
- [x] **AUTH-04**: All task data protected (only authenticated owner can access)
- [x] **AUTH-05**: UI shows loading state during auth check

### Data Storage

- [x] **DATA-01**: Tasks stored in Convex database (not localStorage)
- [x] **DATA-02**: Task schema includes all existing fields (title, description, status, priority, dueDate, tag, timestamps)
- [x] **DATA-03**: Real-time sync between Convex and UI
- [x] **DATA-04**: Existing localStorage data can be migrated to Convex

### MCP Assistant

- [x] **MCP-01**: MCP server provides `list_tasks` tool
- [x] **MCP-02**: MCP server provides `get_task` tool
- [x] **MCP-03**: MCP server provides `create_task` tool
- [x] **MCP-04**: MCP server provides `update_task` tool
- [x] **MCP-05**: MCP server provides `move_task` tool
- [x] **MCP-06**: MCP server provides `delete_task` tool
- [x] **MCP-07**: MCP server provides `search_tasks` tool (by text, priority, tags, due date)
- [x] **MCP-08**: MCP server provides `get_board_summary` tool (counts, overdue, breakdown)

### Security

- [x] **SEC-01**: Remove hardcoded password from source code
- [x] **SEC-02**: Remove fake password gate UI
- [x] **SEC-03**: All Convex functions validate user authentication

## Future Requirements (v1.2+)

Deferred to future milestone. Tracked but not in current roadmap.

### Authentication Enhancements

- **AUTH-F01**: User avatar displayed from Google profile
- **AUTH-F02**: User-friendly auth error messages

### Multi-device

- **SYNC-F01**: Real-time sync across multiple devices/tabs

### Advanced MCP

- **MCP-F01**: Task ID aliases (fuzzy match by title)
- **MCP-F02**: Bulk operations (move multiple tasks)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multiple OAuth providers | Single user, single Google account — no value |
| Email/password auth | OAuth is more secure and simpler |
| Multi-user/team support | v1.1 is single-user only |
| Mobile app | Web-first approach |
| Offline support | Convex requires connection; can add later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REACT-01 | Phase 2 | Complete |
| REACT-02 | Phase 2 | Complete |
| REACT-03 | Phase 2 | Complete |
| AUTH-01 | Phase 3 | Complete |
| AUTH-02 | Phase 3 | Complete |
| AUTH-03 | Phase 3 | Complete |
| AUTH-04 | Phase 3 | Complete |
| AUTH-05 | Phase 3 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 5 | Complete |
| MCP-01 | Phase 4 | Complete |
| MCP-02 | Phase 4 | Complete |
| MCP-03 | Phase 4 | Complete |
| MCP-04 | Phase 4 | Complete |
| MCP-05 | Phase 4 | Complete |
| MCP-06 | Phase 4 | Complete |
| MCP-07 | Phase 4 | Complete |
| MCP-08 | Phase 4 | Complete |
| SEC-01 | Phase 3 | Complete |
| SEC-02 | Phase 3 | Complete |
| SEC-03 | Phase 3 | Complete |

**Coverage:**
- v1.1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after roadmap creation*
