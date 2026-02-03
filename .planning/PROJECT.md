# Loom Board

## What This Is

A self-hosted Kanban board for tracking tasks with AI assistants. Single-page app deployed on Vercel with drag-and-drop task management, search, filtering, and activity history.

## Core Value

Personal task visibility for both human and AI assistant — the board is the shared source of truth for what's being worked on.

## Current Milestone: v1.1 Authentication & Assistant Integration

**Goal:** Replace fake client-side password with real Google OAuth via Convex and enable local AI assistants to read/write tasks via authenticated API.

**Target features:**
- Google OAuth login via Convex Auth
- Cloud task storage in Convex database tied to Google account
- MCP server for local assistant (Claude Code) to read/write tasks
- Security hardening (remove plaintext password, protect API endpoints)

## Requirements

### Validated

- 4-column Kanban (Backlog → In Progress → Blocked → Done) — v1.0
- Drag & drop with animations — v1.0
- Rich task cards (titles, descriptions, due dates, priority levels) — v1.0
- Search and tag filtering — v1.0
- Smart auto-archive (tasks done >7 days) — v1.0
- Activity history (50 recent actions) — v1.0
- Toast notifications — v1.0
- Keyboard shortcuts (Esc, Cmd+Enter) — v1.0
- Import/Export (localStorage + JSON file) — v1.0

### Active

- [ ] Google OAuth login via Convex Auth
- [ ] Cloud task storage in Convex database
- [ ] MCP server for assistant read/write
- [ ] Remove fake password gate
- [ ] Secure API endpoints

### Out of Scope

- Multi-user collaboration — v1.1 is single-user (your Google account only)
- OAuth providers beyond Google — can add later if needed
- Mobile app — web-first
- Real-time sync across devices — can add later

## Context

**Current architecture:** Single HTML file with inline CSS/JS, all data in browser localStorage, deployed on Vercel as static site.

**Security issue:** Current "password protection" is a client-side check against hardcoded plaintext `'loom2026'` — trivially bypassed by viewing source or setting `sessionStorage.setItem('loom-auth', 'true')`.

**Assistant integration:** User wants local AI assistant (Claude Code via MCP) to see current tasks and add/modify them. Requires authenticated API the MCP server can call.

## Constraints

- **Platform**: Convex (auth + database + serverless functions)
- **Hosting**: Vercel for static frontend
- **Auth provider**: Google OAuth via Convex Auth
- **Single-user**: Only the authenticated Google account can access tasks
- **Local MCP**: Assistant runs locally, calls Convex API

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Convex over Vercel KV/Postgres | Unified auth + database + realtime, simpler architecture | — Pending |
| Google OAuth only (no email/password) | User's primary need, simpler than multi-provider | — Pending |
| MCP for assistant integration | Claude Code native, local execution, tool-based | — Pending |

---
*Last updated: 2026-02-02 after switching to Convex architecture*
