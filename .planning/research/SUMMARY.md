# Research Summary: Convex Authentication & Assistant Integration

**Project:** Loom Board
**Domain:** Personal Kanban board with Google OAuth + MCP assistant access
**Researched:** 2026-02-02
**Confidence:** MEDIUM (Convex Auth + vanilla JS is an edge case requiring workarounds)

## Executive Summary

Loom Board v1.1 adds Google OAuth authentication via Convex and MCP integration for Claude Code task management. The core challenge is that **Convex Auth is designed for React, not vanilla JavaScript**. The existing single-file HTML app must either convert to React (recommended for full Convex Auth support) or implement a custom OAuth flow using Better Auth or direct Google Identity Services with JWT validation. This is the critical decision point before implementation begins.

The Convex backend integration itself is straightforward - Convex provides an official MCP server (`npx convex mcp start`) that exposes database operations to Claude Code without requiring a custom MCP implementation. The `ConvexClient` from `convex/browser` supports vanilla JS via CDN imports, enabling real-time subscriptions. The main risks involve OAuth redirect URI configuration across dev/prod environments, subscription memory leaks in vanilla JS (no React cleanup hooks), and accidental production database access via MCP.

The recommended approach is a 5-phase build: (1) Convex backend with schema and CRUD functions, (2) vanilla JS client integration replacing localStorage, (3) Google OAuth authentication - this is where the React vs vanilla JS decision matters most, (4) MCP server configuration for Claude Code, and (5) data migration from localStorage to Convex. Phases 1-2 and Phase 4 are well-documented with standard patterns. Phase 3 (auth) requires deeper research or a framework decision.

## Stack Additions

**Core Convex Platform:**
- `convex` (^1.31.5) - Core client + CLI, includes `ConvexClient` for real-time subscriptions
- TypeScript (^5.x) - Required for Convex function definitions

**Authentication (choose one approach):**
- `@convex-dev/auth` (^0.0.90) + `@auth/core` - If converting to React (recommended)
- Better Auth with Convex adapter - If staying vanilla JS
- Custom JWT with Google Identity Services - Manual but no framework lock-in

**MCP Integration:**
- Convex official MCP server (`npx convex mcp start`) - No custom server needed
- `zod` (^3.x) - For custom tool schemas if extending

**Development:**
- `tsx` (^4.x) - TypeScript execution for any custom scripts

## Feature Table Stakes

### Authentication (Must Have)
| Feature | Complexity | Notes |
|---------|------------|-------|
| Google OAuth sign-in | Low | Single provider sufficient for personal app |
| Session persistence | Low | Convex Auth handles via `authSessions` table |
| Sign-out functionality | Low | `signOut()` from Convex Auth |
| Protected functions | Low | Check `getAuthUserId(ctx)` in all queries/mutations |
| Auth loading state | Low | Handle null identity during auth check |

### MCP Tools (Must Have)
| Tool | Purpose |
|------|---------|
| `list_tasks` | Core read operation with filters |
| `get_task` | Single task by ID |
| `create_task` | Add new tasks |
| `update_task` | Modify existing tasks |
| `move_task` | Change task status/column |
| `delete_task` | Remove tasks |

### Defer to v2+
- Multiple OAuth providers (GitHub, Apple)
- Multi-user/team support
- MCP HTTP/SSE transport
- Task search with fuzzy matching
- Bulk operations via MCP

## Architecture Overview

The target architecture separates the browser frontend, Convex backend, and local MCP server:

```
Browser (index.html)
    |-- ConvexClient (WebSocket)
    |-- Google OAuth popup flow
    v
Convex Backend
    |-- auth.ts (OAuth config)
    |-- tasks.ts (CRUD mutations/queries)
    |-- http.ts (OAuth callbacks)
    |-- schema.ts (users, tasks, history tables)
    v
Local Machine
    |-- Claude Code
    |-- convex-mcp-server (npx convex mcp start)
        Uses developer Convex credentials
```

**Key files to create:**
- `convex/schema.ts` - Database schema with tasks indexed by userId
- `convex/tasks.ts` - CRUD functions with auth checks
- `convex/auth.ts` - Convex Auth provider configuration
- `convex/http.ts` - HTTP routes for OAuth callbacks
- `.env.local` - Convex deployment URL

## Critical Pitfalls

1. **Convex Auth requires React** - The `@convex-dev/auth/react` hooks do not work in vanilla JS. Either convert to React, use Better Auth, or implement custom JWT auth with `ConvexClient.setAuth()`.

2. **Subscription memory leaks** - Without React's `useEffect` cleanup, manually track and call `unsubscribe()` on every `client.onUpdate()` subscription, or memory and bandwidth waste accumulates.

3. **OAuth redirect URI mismatch** - Must configure exact URI in Google Cloud Console: `{CONVEX_HTTP_ACTIONS_URL}/api/auth/callback/google`. Create separate OAuth apps for dev vs production.

4. **Accidental production MCP access** - Never use `--dangerously-enable-production-deployments` flag. Default MCP config targets development only.

5. **Environment variable exposure via MCP** - MCP `envGet` tool exposes secrets including `AUTH_GOOGLE_SECRET`. Disable with `--disable-tools envGet,envSet,envRemove` or accept risk.

## Recommended Build Order

### Phase 1: Convex Backend Setup
**Goal:** Working backend with schema and CRUD functions, testable via dashboard.

**Tasks:**
1. Initialize Convex project (`npx convex init`)
2. Define schema (`convex/schema.ts`) matching current localStorage structure
3. Create task CRUD functions (`convex/tasks.ts`) - no auth required yet
4. Test with Convex dashboard

**Pitfalls to avoid:** Schema must match localStorage data structure (id, title, description, status, tag, priority, dueDate, blockedReason, createdAt, startedAt, completedAt, archived).

### Phase 2: Vanilla JS Client Integration
**Goal:** Replace localStorage with Convex subscriptions, real-time sync working.

**Tasks:**
1. Add `ConvexClient` via CDN (`https://esm.sh/convex@1.31/browser`)
2. Replace `saveData()` with Convex mutations
3. Replace `loadData()` with `client.onUpdate()` subscription
4. Implement subscription cleanup pattern

**Pitfalls to avoid:** Use `ConvexClient` not `ConvexHttpClient`. Track all subscriptions for cleanup. Handle connection state for offline detection.

### Phase 3: Google OAuth Authentication
**Goal:** User authentication, tasks scoped to authenticated user.

**Critical Decision Required:** Vanilla JS vs React conversion.

**Option A (React - Recommended):**
- Convert index.html to React+Vite app
- Use `@convex-dev/auth/react` hooks (`useAuthActions`, `useAuthToken`)
- Full Convex Auth documentation support

**Option B (Vanilla JS with Better Auth):**
- Keep static HTML
- Use Better Auth with Convex adapter
- More setup, less documentation

**Option C (Custom JWT):**
- Keep static HTML
- Use Google Identity Services directly
- Implement custom token fetching for `ConvexClient.setAuth()`
- Highest complexity, most flexibility

**Tasks (regardless of option):**
1. Configure Google OAuth in Google Cloud Console
2. Set environment variables (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
3. Implement auth backend (auth.ts, http.ts)
4. Replace password gate with OAuth login UI
5. Add `userId` filtering to all task queries

**Pitfalls to avoid:** Separate OAuth apps for dev/prod. Test session persistence after refresh (known bug). Wait for auth ready before authenticated queries.

### Phase 4: MCP Server Integration
**Goal:** Claude Code can read/write tasks via Convex MCP server.

**Tasks:**
1. Configure Convex MCP server in Claude Code:
   ```bash
   claude mcp add-json convex '{"type":"stdio","command":"npx","args":["convex","mcp","start"]}'
   ```
2. Test read operations (`status`, `tables`, `data`)
3. Test write operations (`run` with mutations)
4. Document tool usage patterns for Claude Code

**Pitfalls to avoid:** Never enable production access. Disable sensitive env tools. Schema must be deployed and validated before MCP use. MCP has no auth context - admin queries only.

### Phase 5: Migration and Cleanup
**Goal:** Smooth transition from localStorage to Convex for existing data.

**Tasks:**
1. Build localStorage migration flow (bulk insert mutation)
2. Keep localStorage data during transition period (don't delete immediately)
3. Implement "re-import from localStorage" fallback
4. Remove old password gate code
5. Update export/import for new data format

**Pitfalls to avoid:** Don't try dual-write - clean cutover is better. Validate data before and after migration. Test rollback procedure.

## Key Decision Required

**The vanilla JS vs React question must be answered before Phase 3:**

| Approach | Pros | Cons |
|----------|------|------|
| **Convert to React** | Full Convex Auth support, better documentation, real-time hooks | Requires rewrite, adds build step |
| **Stay vanilla JS + Better Auth** | Preserves current architecture, no framework | Less documentation, more custom code |
| **Stay vanilla JS + Custom JWT** | Maximum flexibility, no dependencies | Most complex, highest risk |

**Recommendation:** Convert to React. The existing ~600 lines of JS ports cleanly to React components. You gain type safety, better tooling, and full Convex Auth support. The build system (Vite) is minimal overhead.

## Open Questions

1. **Offline support:** Current app works offline with localStorage. Convex requires connection. Decision needed: require online, or implement offline queue with sync?

2. **Token refresh in vanilla JS:** If staying vanilla JS, how exactly does token refresh work outside React hooks? May need to call `/api/auth/session` endpoint directly.

3. **Session persistence bug:** GitHub issue #193 reports sessions not persisting after refresh with Google OAuth. Monitor for fix or implement workaround.

4. **CDN bundle size:** Full Convex client may be large for static hosting. Measure impact and consider lazy loading.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Convex core well-documented, versions verified |
| Features | HIGH | Official Convex Auth and MCP docs confirm capabilities |
| Architecture | MEDIUM | Convex vanilla JS supported, but auth adaptation is edge case |
| Pitfalls | HIGH | Issues documented in GitHub issues and official troubleshooting |

**Overall confidence:** MEDIUM

The core Convex functionality is well-supported. The main uncertainty is the authentication approach for vanilla JS - this needs a decision and possibly deeper research if Option B or C is chosen.

### Gaps to Address

- **Auth approach:** User must decide React vs vanilla JS before Phase 3 planning
- **Offline behavior:** Current offline capability will be lost - accept or mitigate?
- **Token refresh mechanics:** If vanilla JS, research exact token refresh pattern
- **Bundle size impact:** Measure Convex client size before committing to CDN approach

## Sources

### Primary (HIGH confidence)
- [Convex JavaScript Client](https://docs.convex.dev/client/javascript) - vanilla JS patterns
- [Convex MCP Server](https://docs.convex.dev/ai/convex-mcp-server) - official MCP integration
- [Convex Schemas](https://docs.convex.dev/database/schemas) - schema definition
- [Convex Auth Overview](https://docs.convex.dev/auth/convex-auth) - auth architecture

### Secondary (MEDIUM confidence)
- [Convex Auth Labs](https://labs.convex.dev/auth) - beta auth features
- [Better Auth Convex Integration](https://www.better-auth.com/docs/integrations/convex) - vanilla JS alternative
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - if custom tools needed

### Tertiary (needs validation)
- [Convex Auth Session Issue #193](https://github.com/get-convex/convex-auth/issues/193) - session persistence bug

---
*Research completed: 2026-02-02*
*Ready for roadmap: yes (pending auth approach decision)*
