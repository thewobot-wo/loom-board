# Stack Research: Convex Authentication & Assistant Integration

**Project:** Loom Board
**Researched:** 2026-02-02
**Confidence:** MEDIUM (Convex Auth + vanilla JS is an edge case with limited official support)

## Summary

Adding Convex + Google OAuth + MCP to the existing static HTML Kanban app requires a significant architectural shift. Convex Auth is designed for React, not vanilla JS, so the frontend needs conversion to use React (or you must implement custom OAuth HTTP actions). The MCP server will be a separate Node.js process using stdio transport that calls Convex functions via `ConvexHttpClient`. This is achievable but requires careful attention to the auth flow.

## Recommended Stack Additions

### Convex Platform

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| `convex` | ^1.31.5 | Core Convex client + CLI | Required for all Convex functionality. Includes `convex/browser` for non-React clients and `convex/server` for backend functions. Latest stable. |

**Installation:**
```bash
npm install convex
npx convex dev  # Initialize and start dev server
```

**Key files to create:**
- `convex/schema.ts` - Database schema using `defineSchema`, `defineTable`
- `convex/tasks.ts` - Query/mutation functions for CRUD
- `convex/_generated/` - Auto-generated types (do not edit)

### Convex Auth (Google OAuth)

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| `@convex-dev/auth` | ^0.0.90 | Built-in auth library | Handles OAuth flow, session management, user storage. Still beta but officially supported. |
| `@auth/core` | peer dep | Auth.js core (OAuth providers) | Provides Google provider via Auth.js ecosystem. |

**Installation:**
```bash
npm install @convex-dev/auth @auth/core
```

**CRITICAL LIMITATION:** Convex Auth is designed for React. For vanilla JS, you have two options:

**Option A: Convert frontend to React (Recommended)**
- Use `@convex-dev/auth/react` hooks (`useAuthActions`, `useAuthToken`)
- Standard OAuth flow with signIn/signOut
- Best documentation and support

**Option B: Custom HTTP Actions (Advanced)**
- Implement OAuth redirect/callback as Convex HTTP actions
- Generate JWTs manually
- Use `ConvexClient.setAuth()` with custom token fetcher
- Less documentation, more potential issues

**Required files:**
```
convex/
  auth.config.ts    # Site URL, app name
  auth.ts           # Provider configuration
  http.ts           # HTTP routes for OAuth callbacks
```

**Environment variables (Convex Dashboard):**
```bash
npx convex env set AUTH_GOOGLE_ID "your-google-client-id"
npx convex env set AUTH_GOOGLE_SECRET "your-google-client-secret"
npx convex env set SITE_URL "http://localhost:5173"  # or production URL
npx convex env set JWT_PRIVATE_KEY "..."  # Generated via script
npx convex env set JWKS "..."  # Generated via script
```

**Google Cloud Console setup:**
1. Create OAuth 2.0 Client ID
2. Authorized JavaScript Origins: `http://localhost:5173`
3. Authorized Redirect URIs: `https://<your-convex>.convex.site/api/auth/callback/google`

### MCP Server (Claude Code Integration)

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| `@modelcontextprotocol/server` | ^1.x | MCP server SDK | Official SDK for building MCP servers. Use v1.x for production (v2 in pre-alpha). |
| `zod` | ^3.x | Schema validation | Peer dependency for MCP SDK tool definitions. |

**Installation:**
```bash
npm install @modelcontextprotocol/server zod
```

**MCP server pattern:**
```typescript
// mcp-server/index.ts
import { McpServer } from "@modelcontextprotocol/server/mcp";
import { StdioTransport } from "@modelcontextprotocol/server/stdio";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
const server = new McpServer({ name: "loom-board", version: "1.0.0" });

server.tool("list_tasks", { status: z.string().optional() }, async (args) => {
  const tasks = await convex.query(api.tasks.list, args);
  return { content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }] };
});

server.tool("create_task", {
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["backlog", "in-progress", "blocked", "done"]),
  priority: z.enum(["p0", "p1", "p2", "p3"]).optional(),
  tag: z.string().optional(),
}, async (args) => {
  const id = await convex.mutation(api.tasks.create, args);
  return { content: [{ type: "text", text: `Created task ${id}` }] };
});

const transport = new StdioTransport();
await server.connect(transport);
```

**Claude Code configuration (`~/.claude/claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "loom-board": {
      "command": "node",
      "args": ["/path/to/loom-board/mcp-server/dist/index.js"],
      "env": {
        "CONVEX_URL": "https://your-deployment.convex.cloud"
      }
    }
  }
}
```

### Supporting Libraries

| Package | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | ^4.x | TypeScript execution | Dev mode for MCP server without build step |
| `typescript` | ^5.x | Type checking | Required for Convex functions |

## Integration Notes

### How Convex Integrates with Static HTML

The existing app is vanilla HTML/CSS/JS. Integration paths:

**Path 1: Full React conversion (Recommended for auth)**
- Replace `index.html` with React app (Vite + React)
- Use `ConvexProvider` and `ConvexProviderWithAuth` from `@convex-dev/auth/react`
- Full access to Convex Auth hooks
- Enables real-time subscriptions via `useQuery`

**Path 2: Hybrid approach (Keep vanilla JS, limited auth)**
- Use `ConvexHttpClient` from `convex/browser` for data
- Implement custom OAuth via HTTP actions (complex)
- No real-time updates (polling required)
- Auth state management is manual

**Path 3: Minimal change (MCP only, no web auth)**
- Keep existing localStorage for web UI
- MCP server directly accesses Convex
- Web users don't authenticate
- Simplest but no cloud sync for web users

### Database Schema Design

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,  // Required for Convex Auth

  tasks: defineTable({
    userId: v.id("users"),  // Link to authenticated user
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("backlog"),
      v.literal("in-progress"),
      v.literal("blocked"),
      v.literal("done")
    ),
    priority: v.optional(v.union(
      v.literal("p0"),
      v.literal("p1"),
      v.literal("p2"),
      v.literal("p3")
    )),
    tag: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    blockedReason: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),
});
```

### MCP Server Authentication

The MCP server runs locally and needs to authenticate with Convex to access user data. Options:

1. **Service account pattern**: MCP has admin-level access (simpler but less secure)
2. **User token passthrough**: MCP requests user's Convex token (more secure, more complex)

For a personal Kanban board, service account is acceptable:
```typescript
// MCP server reads all tasks (no user filtering)
// Or uses a dedicated "mcp-bot" user ID
```

## What NOT to Add

| Library/Pattern | Why Avoid |
|-----------------|-----------|
| `@auth/core` providers beyond Google | YAGNI - start with one provider, add more later if needed |
| React Query / TanStack Query | Convex has built-in caching and real-time; don't duplicate |
| Custom JWT library | Convex Auth handles JWTs; don't roll your own |
| Better Auth | Only consider if Convex Auth limitations become blockers |
| HTTP transport for MCP | stdio is simpler for local Claude Code integration |
| Database ORMs | Convex has its own query API; ORMs don't apply |
| Express/Hono middleware for MCP | Use basic stdio transport; HTTP only if remote access needed |
| Clerk/Auth0 | Convex Auth handles Google OAuth natively; external services add complexity |

## Key Decisions

### Frontend Architecture Decision

**Recommendation: Convert to React (minimal)**

Why:
- Convex Auth requires React hooks for OAuth flow
- Real-time subscriptions are a major Convex benefit (requires React)
- Existing JS logic ports cleanly to React
- TypeScript catches errors early

Minimal React setup:
```bash
npm create vite@latest . -- --template react-ts
npm install convex @convex-dev/auth
```

### MCP Server Architecture Decision

**Recommendation: Separate package in repo**

```
loom-board/
  src/              # React frontend
  convex/           # Convex functions
  mcp-server/       # MCP server (Node.js)
    src/
      index.ts
    package.json
    tsconfig.json
```

The MCP server has different runtime requirements (Node.js with stdio) than the frontend (browser), so keeping it separate avoids bundler conflicts.

## Migration Path

1. **Phase 1**: Set up Convex project, schema, basic CRUD functions
2. **Phase 2**: Convert frontend to React, integrate Convex client
3. **Phase 3**: Add Convex Auth with Google OAuth
4. **Phase 4**: Build MCP server with tools for task operations
5. **Phase 5**: Data migration from localStorage to Convex

## References

### Official Documentation
- [Convex JavaScript Client](https://docs.convex.dev/client/javascript) - ConvexHttpClient, ConvexClient usage
- [Convex Auth](https://labs.convex.dev/auth) - Setup guide, OAuth configuration
- [Convex Auth Google Provider](https://labs.convex.dev/auth/config/oauth/google) - Google-specific setup
- [Convex Schemas](https://docs.convex.dev/database/schemas) - defineSchema, defineTable
- [Convex Mutations](https://docs.convex.dev/functions/mutation-functions) - mutation function syntax

### MCP Resources
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Official SDK repository
- [@modelcontextprotocol/server on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - Package details

### Convex npm Packages
- [convex on npm](https://www.npmjs.com/package/convex) - Core package (v1.31.5)
- [@convex-dev/auth on npm](https://www.npmjs.com/package/@convex-dev/auth) - Auth library (v0.0.90)

## Confidence Assessment

| Area | Level | Notes |
|------|-------|-------|
| Convex core | HIGH | Well-documented, widely used |
| Convex Auth + React | HIGH | Official examples available |
| Convex Auth + vanilla JS | LOW | Not officially supported; requires custom work |
| MCP stdio server | MEDIUM | SDK is mature but v2 changes coming |
| MCP + Convex integration | MEDIUM | Standard HTTP client pattern; no special concerns |
