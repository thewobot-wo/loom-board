# Features Research: Convex Authentication & Assistant Integration

**Domain:** Personal Kanban board with Google OAuth + MCP assistant access
**Researched:** 2026-02-02
**Confidence:** HIGH (verified via official Convex docs and MCP specification)

## Summary

Loom Board v1.1 adds two capabilities: (1) Google OAuth login via Convex Auth so only the owner can access their board, and (2) MCP server integration so Claude Code can read/modify tasks programmatically. For a single-user personal app, the authentication story is straightforward—Convex Auth handles the heavy lifting with minimal configuration. The MCP integration requires building a small TypeScript server that exposes task CRUD operations as MCP tools.

## Authentication Features

### Table Stakes

| Feature | Complexity | Why Essential |
|---------|------------|---------------|
| **Google OAuth sign-in** | Low | Single sign-on eliminates password management; Convex Auth provides turnkey Google support via `@auth/core/providers/google` |
| **Session persistence** | Low | Convex Auth manages sessions automatically via `authSessions` table; user stays logged in across browser refreshes |
| **Sign-out functionality** | Low | Required to switch accounts or secure shared devices; `signOut()` exported from Convex Auth |
| **Protected routes/functions** | Low | All queries/mutations check `ctx.auth.getUserIdentity()` or `getAuthUserId(ctx)` to enforce owner-only access |
| **Loading state during auth check** | Low | On page load, `getUserIdentity()` returns null until auth completes; UI must handle this gracefully |

### Differentiators

| Feature | Complexity | Why Valuable |
|---------|------------|--------------|
| **User avatar from Google profile** | Low | `pictureUrl` field available from OAuth identity; adds visual polish to header |
| **"Remember this device" UX** | Low | Sessions persist by default; can configure session lifetime for convenience vs security tradeoff |
| **Auth error messages** | Low | Display user-friendly errors when OAuth fails (popup blocked, network error, account mismatch) |

### Anti-Features (Don't Build for v1.1)

| Feature | Why Not |
|---------|---------|
| **Multiple OAuth providers** | Single user, single Google account—adding GitHub/Apple adds complexity without value |
| **Email/password auth** | OAuth is more secure and simpler for personal use; passwords require reset flows, verification |
| **Multi-user/team support** | Explicit scope is single-user; would require role-based access control, invitations, etc. |
| **Custom domain OAuth consent** | Requires Convex Pro; `convex.site` domain in consent screen is acceptable for personal tool |
| **Session management UI** | Single user doesn't need to view/revoke multiple sessions; complexity without benefit |
| **2FA/MFA** | Google OAuth already provides this at the provider level |

## MCP Assistant Features

### Table Stakes

| Feature | Complexity | Why Essential |
|---------|------------|---------------|
| **`list_tasks` tool** | Low | Core read operation; returns all tasks with their metadata (title, status, priority, due date, tags) |
| **`get_task` tool** | Low | Fetch single task by ID for detailed viewing |
| **`create_task` tool** | Low | Add new tasks via assistant; accepts title, description, column, priority, due date, tags |
| **`update_task` tool** | Medium | Modify existing task fields; partial updates supported |
| **`move_task` tool** | Low | Change task column (Backlog -> In Progress -> Review -> Done); core workflow action |
| **`delete_task` tool** | Low | Remove tasks; requires task ID |
| **stdio transport** | Low | Standard transport for local MCP servers; Claude Code spawns process and communicates via stdin/stdout |
| **Zod schema validation** | Low | MCP SDK requires Zod for tool parameter schemas; provides type safety and LLM-readable descriptions |

### Differentiators

| Feature | Complexity | Why Valuable |
|---------|------------|--------------|
| **`search_tasks` tool** | Medium | Query tasks by text match, priority, tags, due date range; enables "show me high priority tasks due this week" |
| **`get_board_summary` tool** | Low | Return counts by column, overdue tasks, priority breakdown; enables "how's my board looking?" queries |
| **`bulk_move_tasks` tool** | Medium | Move multiple tasks at once; enables "move all completed review items to done" |
| **Rich tool descriptions** | Low | Detailed descriptions help LLM understand when to use each tool; improves assistant accuracy |
| **Task ID aliases** | Medium | Accept task titles as fuzzy matches, not just IDs; more natural interaction ("update the login task") |

### Anti-Features (Don't Build for v1.1)

| Feature | Why Not |
|---------|---------|
| **Authentication in MCP server** | Local stdio server runs with user's permissions; Claude Code is already trusted locally |
| **HTTP/SSE transport** | Not needed for local-only assistant; stdio is simpler and doesn't require network setup |
| **MCP Resources** | Tools suffice for CRUD; resources add complexity without clear benefit for task management |
| **MCP Prompts** | Custom prompts are nice-to-have; focus on tools first |
| **Activity history via MCP** | Read-only history is low value for assistant; can add later if needed |
| **Real-time subscriptions** | MCP doesn't support push notifications; assistant queries on-demand |
| **Undo/redo via MCP** | Complex state management; user can undo in UI if needed |

## Feature Dependencies

```
AUTHENTICATION FLOW:
Google OAuth configured (env vars)
    -> convex/auth.ts provider setup
    -> HTTP routes for callback
    -> UI sign-in button
    -> Protected queries/mutations
    -> User identity available in functions

MCP INTEGRATION FLOW:
Task data model exists (already built)
    -> MCP server with Convex client
    -> Tool definitions with Zod schemas
    -> stdio transport setup
    -> Claude Code configuration (claude mcp add)
    -> Assistant can access tasks

CROSS-CUTTING:
Authentication does NOT block MCP server development
    - MCP server runs locally with file-based or Convex storage
    - Can develop tools against existing task-board.json initially
    - Production: MCP server uses Convex client with service-level access
```

## Implementation Notes

### Convex Auth Setup (from official docs)

1. Set environment variables:
   ```bash
   npx convex env set AUTH_GOOGLE_ID <client_id>
   npx convex env set AUTH_GOOGLE_SECRET <client_secret>
   ```

2. Configure `convex/auth.ts`:
   ```typescript
   import Google from "@auth/core/providers/google";
   import { convexAuth } from "@convex-dev/auth/server";

   export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
     providers: [Google],
   });
   ```

3. Callback URL format: `https://{deployment}.convex.site/api/auth/callback/google`

4. Protect functions:
   ```typescript
   import { getAuthUserId } from "@convex-dev/auth/server";

   export const getTasks = query({
     handler: async (ctx) => {
       const userId = await getAuthUserId(ctx);
       if (!userId) throw new Error("Unauthenticated");
       // ... fetch tasks
     }
   });
   ```

### MCP Server Setup (from TypeScript SDK)

1. Install SDK:
   ```bash
   npm install @modelcontextprotocol/sdk zod
   ```

2. Define tools with Zod schemas for parameters

3. Register with Claude Code:
   ```bash
   claude mcp add --transport stdio loom-board -- node /path/to/mcp-server.js
   ```

4. Configuration stored in `~/.claude.json` or project `.mcp.json`

## Sources

**Convex Auth:**
- [Convex Auth Google OAuth Setup](https://labs.convex.dev/auth/config/oauth/google)
- [Convex Auth Overview](https://docs.convex.dev/auth/convex-auth)
- [Auth in Functions](https://docs.convex.dev/auth/functions-auth)
- [Manual Setup Guide](https://labs.convex.dev/auth/setup/manual)

**MCP:**
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)

**Security Best Practices:**
- [Auth0 Token Best Practices](https://auth0.com/docs/secure/tokens/token-best-practices)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
