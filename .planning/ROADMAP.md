# Roadmap: Loom Board v1.1

## Overview

This milestone transforms Loom Board from a localStorage-based vanilla JS app into a cloud-backed React app with Google OAuth and MCP assistant integration. The journey follows Convex's recommended architecture: build the backend first, convert the frontend to React with Convex hooks, add authentication, configure MCP tools for Claude Code, and migrate existing data. Each phase builds on the previous, delivering verifiable capabilities.

**Milestone:** v1.1 Authentication & Assistant Integration
**Phases:** 5
**Requirements:** 23

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Convex Backend** - Database schema and CRUD functions
- [x] **Phase 2: React Frontend** - Convert vanilla JS to React with Convex integration
- [x] **Phase 3: Authentication** - Google OAuth and security hardening
- [x] **Phase 4: MCP Integration** - Claude Code task management tools
- [ ] **Phase 5: Migration** - LocalStorage data migration to Convex

## Phase Details

### Phase 1: Convex Backend
**Goal**: Working Convex backend with task schema and CRUD functions testable via dashboard
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. Convex project initialized and connected to deployment
  2. Task schema exists with all required fields (title, description, status, priority, dueDate, tag, timestamps)
  3. Tasks can be created, read, updated, and deleted via Convex dashboard
  4. Activity history schema exists for tracking changes
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Initialize Convex and define schema
- [x] 01-02-PLAN.md — Implement CRUD and activity tracking

### Phase 2: React Frontend
**Goal**: React app with full feature parity to vanilla JS version, connected to Convex for real-time sync
**Depends on**: Phase 1
**Requirements**: REACT-01, REACT-02, REACT-03, DATA-03
**Success Criteria** (what must be TRUE):
  1. App loads as React application (Vite build system)
  2. All 4 columns display (Backlog, In Progress, Blocked, Done) with tasks from Convex
  3. User can drag and drop tasks between columns with animations
  4. Search, tag filtering, and priority filtering work as before
  5. Activity history, auto-archive, toasts, and keyboard shortcuts work as before
**Plans:** 7 plans

Plans:
- [x] 02-01-PLAN.md — Initialize Vite + React + TypeScript with Convex provider
- [x] 02-02-PLAN.md — Create Board, Column, TaskCard components with CSS modules
- [x] 02-03-PLAN.md — Implement drag-and-drop with dnd-kit and optimistic updates
- [x] 02-04-PLAN.md — Create TaskModal for create/edit/delete operations
- [x] 02-05-PLAN.md — Implement search and tag filtering with Header
- [x] 02-06-PLAN.md — Add activity history panel and toast notifications
- [x] 02-07-PLAN.md — Complete auto-archive, archive section, keyboard shortcuts, verification

### Phase 3: Authentication
**Goal**: Users authenticate with Google OAuth; all data protected by user identity
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. User can sign in with Google account and sees their tasks
  2. User session persists after browser refresh (no re-login required)
  3. User can sign out and is returned to login screen
  4. Loading state shown during auth check (no flash of content)
  5. Hardcoded password and fake gate removed from codebase
  6. Unauthenticated API calls return error (Convex functions validate auth)
**Plans:** 4 plans

Plans:
- [x] 03-01-PLAN.md — Set up Convex Auth backend with Google OAuth provider
- [x] 03-02-PLAN.md — Protect all Convex task functions with authentication
- [x] 03-03-PLAN.md — Set up frontend auth provider, login screen, and routing
- [x] 03-04-PLAN.md — Add user display in header, sign out, and cleanup legacy auth

### Phase 4: MCP Integration
**Goal**: Claude Code can read and write tasks via MCP tools
**Depends on**: Phase 3
**Requirements**: MCP-01, MCP-02, MCP-03, MCP-04, MCP-05, MCP-06, MCP-07, MCP-08
**Success Criteria** (what must be TRUE):
  1. Claude Code can list all tasks on the board
  2. Claude Code can get details of a specific task by ID
  3. Claude Code can create new tasks with title, description, and metadata
  4. Claude Code can update task fields and move tasks between columns
  5. Claude Code can search tasks by text, priority, tags, status, or due date
  6. Claude Code can get board summary (counts per column, overdue tasks)
**Plans:** 5 plans

Plans:
- [x] 04-01-PLAN.md — Convex HTTP action endpoints with API token authentication
- [x] 04-02-PLAN.md — MCP server scaffold with read tools (list, get, search, summary)
- [x] 04-03-PLAN.md — MCP write tools (create, update, move, delete, archive) and .mcp.json config
- [x] 04-04-PLAN.md — Restructure MCP server into src/mcp/ and fix token placeholder
- [x] 04-05-PLAN.md — Add status filter to search and update tracking docs

### Phase 5: Migration
**Goal**: Existing localStorage data migrated to Convex; clean transition for returning users
**Depends on**: Phase 3
**Requirements**: DATA-04
**Success Criteria** (what must be TRUE):
  1. User with existing localStorage data sees migration prompt on first authenticated login
  2. Migration imports all tasks with preserved fields and timestamps
  3. Migration handles edge cases (empty data, malformed data) gracefully
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Convex Backend | 2/2 | ✓ Complete | 2026-02-02 |
| 2. React Frontend | 7/7 | ✓ Complete | 2026-02-02 |
| 3. Authentication | 4/4 | ✓ Complete | 2026-02-02 |
| 4. MCP Integration | 5/5 | Gap closure complete | 2026-02-03 |
| 5. Migration | 0/TBD | Not started | - |

## Requirement Coverage

All 23 v1.1 requirements mapped:

| Requirement | Phase | Description |
|-------------|-------|-------------|
| DATA-01 | 1 | Tasks stored in Convex database |
| DATA-02 | 1 | Task schema includes all existing fields |
| REACT-01 | 2 | App converted to React |
| REACT-02 | 2 | All existing UI functionality preserved |
| REACT-03 | 2 | All existing features working |
| DATA-03 | 2 | Real-time sync between Convex and UI |
| AUTH-01 | 3 | Google sign-in via Convex Auth |
| AUTH-02 | 3 | Session persists across refresh |
| AUTH-03 | 3 | User can sign out |
| AUTH-04 | 3 | All task data protected |
| AUTH-05 | 3 | UI shows loading state during auth |
| SEC-01 | 3 | Remove hardcoded password |
| SEC-02 | 3 | Remove fake password gate UI |
| SEC-03 | 3 | All Convex functions validate auth |
| MCP-01 | 4 | list_tasks tool |
| MCP-02 | 4 | get_task tool |
| MCP-03 | 4 | create_task tool |
| MCP-04 | 4 | update_task tool |
| MCP-05 | 4 | move_task tool |
| MCP-06 | 4 | delete_task tool |
| MCP-07 | 4 | search_tasks tool |
| MCP-08 | 4 | get_board_summary tool |
| DATA-04 | 5 | LocalStorage migration to Convex |

**Coverage:** 23/23 requirements mapped. None unmapped.

---
*Roadmap created: 2026-02-02*
*Milestone: v1.1 Authentication & Assistant Integration*
