# Milestones

## Completed

### v1.0 — Core Kanban Board

**Shipped:** 2026-02-02 (inferred from package.json)
**Phases:** 1-5 (inferred, not tracked in GSD)

**What shipped:**
- 4-column Kanban (Backlog → In Progress → Blocked → Done)
- Drag & drop with smooth animations
- Rich task cards (titles, descriptions, due dates, priority levels)
- Search by title/description
- Tag filtering (Project, Research, Bug, Feature, Maintenance, Cruise)
- Priority levels (P0-P3 with color coding)
- Due date indicators (overdue red, soon-due yellow)
- Current task banner with elapsed time
- Activity history (50 recent actions)
- Toast notifications
- Keyboard shortcuts (Esc, Cmd+Enter)
- Smart auto-archive (done >7 days)
- Import/Export (localStorage + JSON file)
- Basic password gate (client-side, insecure)

**Deployed:** Vercel (static site)

---

## In Progress

### v1.1 — Authentication & Assistant Integration

**Started:** 2026-02-02
**Goal:** Real authentication + AI assistant read/write access

**Target features:**
- Google OAuth login
- Cloud task storage (Vercel KV/Postgres)
- MCP server for assistant integration
- Security hardening

**Phases:** Starting at Phase 1 (first GSD-tracked milestone)
