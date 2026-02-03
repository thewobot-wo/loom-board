# Phase 4: MCP Integration - Research

**Researched:** 2026-02-02
**Domain:** MCP (Model Context Protocol) server + Convex backend integration
**Confidence:** HIGH

## Summary

This phase exposes Loom Board task operations as MCP tools so Claude Code can read, write, search, and summarize tasks programmatically. The research covers three interrelated domains: (1) building a local MCP server using the official TypeScript SDK with stdio transport, (2) connecting that server to the existing Convex backend via `ConvexHttpClient`, and (3) authenticating the MCP server with an API token pattern.

The standard approach is a standalone Node.js process that runs locally via stdio transport, uses `@modelcontextprotocol/sdk` to register 8 tools with Zod schemas, and calls Convex backend functions through `ConvexHttpClient` from the `convex/browser` package. Authentication uses a simple shared-secret API token stored as an environment variable, validated by Convex HTTP actions or custom public functions that check the token before executing operations.

The MCP server lives in a dedicated `mcp-server/` directory at the project root with its own `tsconfig.json` (targeting Node.js, not browser), its own build step, and is configured in Claude Code via `.mcp.json` (project scope) or the `claude mcp add` CLI command.

**Primary recommendation:** Build a local stdio MCP server as a separate TypeScript sub-project that uses `ConvexHttpClient` to call existing Convex query/mutation functions, authenticating via a personal API token passed as an environment variable and validated by a thin authentication layer in Convex.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | ^1.25 | MCP server SDK (McpServer, StdioServerTransport) | Official TypeScript SDK, 11k+ GitHub stars, maintained by Anthropic |
| `zod` | ^3.25 | Schema validation for tool inputs | Required peer dependency of MCP SDK |
| `convex` | ^1.31 (already installed) | ConvexHttpClient for calling backend functions | Already in project, provides typed HTTP client |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | ^4.x | Run TypeScript directly without build step during dev | Development/testing of MCP server |
| `typescript` | ^5.9 (already installed) | Compile MCP server to JS | Production build |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ConvexHttpClient | Raw HTTP fetch to Convex API | Loses typed function references; ConvexHttpClient is simpler and already available |
| Stdio transport | Streamable HTTP transport | HTTP is for remote servers; stdio is standard for local Claude Code integration |
| Separate mcp-server dir | Inline in convex/ | MCP server runs in Node.js, not Convex runtime; must be separate |

**Installation:**
```bash
# In the mcp-server/ subdirectory
npm install @modelcontextprotocol/sdk zod
# convex is already in the parent project; reference via relative path or install separately
```

## Architecture Patterns

### Recommended Project Structure
```
loom-board/
├── convex/                     # Existing Convex backend (unchanged)
│   ├── tasks.ts                # Existing task CRUD
│   ├── mcpApi.ts               # NEW: MCP-specific queries/mutations (token auth)
│   └── schema.ts               # Existing schema
├── mcp-server/                 # NEW: MCP server sub-project
│   ├── package.json            # Separate dependencies
│   ├── tsconfig.json           # Node.js target (not browser)
│   ├── src/
│   │   ├── index.ts            # Entry point: McpServer + StdioServerTransport
│   │   ├── tools/              # Tool definitions (one file per tool or grouped)
│   │   │   ├── tasks.ts        # list, get, create, update, move, delete tools
│   │   │   ├── search.ts       # search_tasks tool
│   │   │   └── summary.ts      # get_board_summary tool
│   │   ├── convex-client.ts    # ConvexHttpClient setup + auth
│   │   └── types.ts            # Shared types, date formatting helpers
│   └── build/                  # Compiled JS output
├── .mcp.json                   # Project-scoped MCP config for Claude Code
└── .env.local                  # Existing env vars (add MCP_API_TOKEN)
```

### Pattern 1: Local Stdio MCP Server with ConvexHttpClient
**What:** A Node.js process started by Claude Code via stdio transport that communicates with the Convex cloud backend through `ConvexHttpClient`.
**When to use:** Always -- this is the architecture for this phase.
**Example:**
```typescript
// Source: https://modelcontextprotocol.io/docs/develop/build-server (TypeScript tab)
// mcp-server/src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL!;
const API_TOKEN = process.env.MCP_API_TOKEN!;

if (!CONVEX_URL || !API_TOKEN) {
  console.error("Missing CONVEX_URL or MCP_API_TOKEN environment variables");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

const server = new McpServer({
  name: "loom-board",
  version: "1.0.0",
});

// Register tools here (see Pattern 2)

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Loom Board MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

### Pattern 2: Tool Registration with Zod Schemas
**What:** Each MCP tool is registered with `server.registerTool()` using Zod schemas for input validation.
**When to use:** For every tool definition.
**Example:**
```typescript
// Source: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md
import { z } from "zod";

server.registerTool(
  "list_tasks",
  {
    description: "List all active (non-archived) tasks on the board",
    inputSchema: {
      status: z.enum(["backlog", "in_progress", "blocked", "done"])
        .optional()
        .describe("Filter by status column"),
    },
  },
  async ({ status }) => {
    // Call Convex backend
    const tasks = status
      ? await convex.query(api.mcpApi.listTasksByStatus, { token: API_TOKEN, status })
      : await convex.query(api.mcpApi.listTasks, { token: API_TOKEN });

    return {
      content: [{
        type: "text",
        text: JSON.stringify(tasks, null, 2),
      }],
    };
  }
);
```

### Pattern 3: API Token Authentication via Convex Functions
**What:** Dedicated Convex functions (queries/mutations) that accept an API token parameter and validate it against a stored/environment-variable token before executing operations.
**When to use:** For all MCP-facing Convex functions.
**Example:**
```typescript
// convex/mcpApi.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper to validate MCP token and get the associated user
async function validateMcpToken(ctx: any, token: string) {
  // Option A: Check against environment variable
  const validToken = process.env.MCP_API_TOKEN;
  if (!validToken || token !== validToken) {
    throw new Error("Invalid API token");
  }
  // Return the user ID associated with this token
  // (stored in environment variable or looked up from a tokens table)
  const userId = process.env.MCP_USER_ID;
  if (!userId) throw new Error("MCP user not configured");
  return userId;
}

export const listTasks = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await validateMcpToken(ctx, args.token);
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
  },
});
```

### Pattern 4: Alternative -- Convex HTTP Actions with Bearer Token
**What:** Instead of passing tokens as function args, define HTTP action endpoints that check `Authorization: Bearer <token>` headers and call internal queries/mutations.
**When to use:** If you want a cleaner REST-like API layer. The MCP server would use `fetch()` instead of `ConvexHttpClient`.
**Example:**
```typescript
// convex/http.ts -- add routes
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

http.route({
  path: "/api/tasks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token || token !== process.env.MCP_API_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }
    const userId = process.env.MCP_USER_ID;
    const tasks = await ctx.runQuery(internal.tasks.listTasksForUser, { userId });
    return new Response(JSON.stringify(tasks), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});
```

### Recommended Approach: ConvexHttpClient + Token-Validated Public Functions

After weighing the options, the recommended approach is:

1. **Create `convex/mcpApi.ts`** with public query/mutation functions that accept a `token` parameter
2. **Validate the token** against `process.env.MCP_API_TOKEN` (Convex environment variable set via dashboard)
3. **Use `ConvexHttpClient`** from the MCP server to call these typed functions
4. **Store the user ID** in a Convex environment variable (`MCP_USER_ID`) so the token maps to a specific user

This is simpler than HTTP actions because:
- Full type safety via `api.mcpApi.*` references
- No need to manually serialize/deserialize JSON
- No need to manage HTTP response codes
- Convex environment variables are set once in the dashboard

### Anti-Patterns to Avoid
- **Writing to stdout in stdio MCP server:** This corrupts JSON-RPC messages. Use `console.error()` for all logging.
- **Sharing ConvexHttpClient between concurrent requests:** The client is stateful. Create one per server instance (fine for stdio since it is single-user).
- **Passing Convex document IDs as plain strings:** Convex IDs are typed (`Id<"tasks">`). The MCP tools should accept string IDs and the Convex functions should validate them.
- **Skipping token validation:** Even though this is a local server, the Convex functions are publicly accessible. Always validate the token.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON-RPC over stdio | Custom stdin/stdout parsing | `StdioServerTransport` from MCP SDK | Handles message framing, error serialization, protocol negotiation |
| Tool input validation | Manual type checking | Zod schemas in `registerTool` | MCP SDK auto-validates and returns structured errors |
| Convex function calls from Node.js | Raw HTTP fetch to `/api/query` | `ConvexHttpClient` | Type-safe, handles serialization, auth token management |
| Date formatting | Custom date formatting | `Intl.DateTimeFormat` or simple helper | Per CONTEXT.md: human-readable dates like "Feb 3, 2026" |
| MCP server configuration | Manual JSON editing | `claude mcp add` CLI or `.mcp.json` | Standard Claude Code configuration mechanism |

**Key insight:** The MCP SDK and ConvexHttpClient handle all the transport, serialization, and protocol complexity. The implementation is primarily business logic: mapping tool inputs to Convex function calls and formatting the results.

## Common Pitfalls

### Pitfall 1: console.log in Stdio Server
**What goes wrong:** Using `console.log()` corrupts the JSON-RPC message stream over stdio, causing the MCP connection to break silently.
**Why it happens:** Stdio transport uses stdout for JSON-RPC messages. `console.log()` writes to stdout.
**How to avoid:** Use `console.error()` for ALL logging. Or use a logging library configured to write to stderr.
**Warning signs:** MCP server connects but tools fail silently, or connection drops immediately.

### Pitfall 2: Convex ID Type Mismatch
**What goes wrong:** MCP tool receives a task ID as a plain string, but Convex expects `Id<"tasks">`.
**Why it happens:** MCP tools pass JSON strings. Convex validators expect specific ID types.
**How to avoid:** Use `v.id("tasks")` in the Convex function args -- Convex will validate and cast the string. In the MCP tool description, document that IDs should be Convex document IDs (format: `abc123def456`).
**Warning signs:** "Invalid ID" errors when calling get_task or update_task.

### Pitfall 3: Missing Environment Variables at Startup
**What goes wrong:** MCP server starts but immediately crashes because `CONVEX_URL` or `MCP_API_TOKEN` is not set.
**Why it happens:** Environment variables in `.mcp.json` or `claude mcp add --env` were not configured, or the values are wrong.
**How to avoid:** Validate all required env vars at startup before connecting transport. Print clear error messages to stderr.
**Warning signs:** "Connection closed" error in Claude Code when trying to use MCP tools.

### Pitfall 4: Token Not Set in Convex Environment
**What goes wrong:** MCP server sends valid token but Convex functions reject it because `MCP_API_TOKEN` environment variable is not set in the Convex dashboard.
**Why it happens:** Convex environment variables (set via `npx convex env set`) are separate from local `.env.local` variables.
**How to avoid:** Set `MCP_API_TOKEN` and `MCP_USER_ID` via `npx convex env set MCP_API_TOKEN <value>` so they are available in the Convex cloud runtime.
**Warning signs:** "Invalid API token" errors on every MCP tool call.

### Pitfall 5: Forgetting to Build Before Testing
**What goes wrong:** Claude Code launches the MCP server but runs stale JavaScript because TypeScript was not recompiled.
**Why it happens:** The `.mcp.json` points to the built JS file, not the TS source.
**How to avoid:** Either use `tsx` for development (runs TS directly) or set up a watch build. For production, ensure the build step is documented.
**Warning signs:** Changes to tool definitions don't take effect.

### Pitfall 6: Convex Query/Mutation vs Action Confusion
**What goes wrong:** Trying to read environment variables directly in a Convex query/mutation function.
**Why it happens:** Convex queries and mutations run in an isolated runtime. Environment variables accessed via `process.env` in queries/mutations may not work as expected -- they need to be accessed as Convex environment variables.
**How to avoid:** Use Convex environment variables set via `npx convex env set`. Access them in the function runtime. Alternatively, implement the token check in an HTTP action (which has full access to `process.env`).
**Warning signs:** `process.env.MCP_API_TOKEN` is `undefined` inside Convex functions.

**IMPORTANT NOTE:** Convex queries and mutations do NOT have access to `process.env`. Environment variables in Convex are accessed differently. There are two viable approaches:
1. **HTTP Actions approach:** Build HTTP action endpoints that DO have access to `process.env` and call internal queries/mutations
2. **Token table approach:** Store valid API tokens in a Convex table and validate against the database

This is a critical architectural decision. See Open Questions section.

## Code Examples

Verified patterns from official sources:

### MCP Server Entry Point (Stdio)
```typescript
// Source: https://modelcontextprotocol.io/docs/develop/build-server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "loom-board",
  version: "1.0.0",
});

// Tool registration
server.registerTool(
  "get_task",
  {
    description: "Get details of a specific task by its ID",
    inputSchema: {
      id: z.string().describe("The Convex document ID of the task"),
    },
  },
  async ({ id }) => {
    // Call Convex backend...
    return {
      content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Loom Board MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

### ConvexHttpClient Usage from Node.js
```typescript
// Source: https://docs.convex.dev/client/javascript
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient(process.env.CONVEX_URL!);

// Query
const tasks = await client.query(api.tasks.listTasks);

// Mutation
const newTask = await client.mutation(api.tasks.createTask, {
  title: "New task",
  status: "backlog",
  priority: "medium",
  tags: [],
  order: 0,
});
```

### Tool Response Format (Human-Readable Dates)
```typescript
// Per CONTEXT.md: dates in human-readable format
function formatTask(task: any) {
  return {
    id: task._id,
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    tags: task.tags,
    dueDate: task.dueDate
      ? new Date(task.dueDate).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric"
        })
      : null,
    createdAt: new Date(task._creationTime).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    }),
    updatedAt: new Date(task.updatedAt).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    }),
  };
}
```

### Claude Code .mcp.json Configuration
```json
// Source: https://code.claude.com/docs/en/mcp
{
  "mcpServers": {
    "loom-board": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-server/build/index.js"],
      "env": {
        "CONVEX_URL": "${CONVEX_URL}",
        "MCP_API_TOKEN": "${MCP_API_TOKEN}"
      }
    }
  }
}
```

### Convex HTTP Action with Token Auth
```typescript
// Source: https://docs.convex.dev/functions/http-actions
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// In convex/http.ts
http.route({
  path: "/mcp/tasks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    // HTTP actions CAN access process.env
    if (!token || token !== process.env.MCP_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tasks = await ctx.runQuery(internal.tasks.listAllTasksForUser, {
      userId: process.env.MCP_USER_ID!,
    });

    return new Response(JSON.stringify(tasks), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
```

### Search Tool with Combined Filters
```typescript
server.registerTool(
  "search_tasks",
  {
    description: "Search tasks by text, priority, tags, or due date. All filters combine with AND logic.",
    inputSchema: {
      query: z.string().optional().describe("Text to search in title and description"),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional()
        .describe("Filter by priority level"),
      tags: z.array(z.string()).optional()
        .describe("Filter by tags (task must have ALL specified tags)"),
      dueDate: z.enum(["overdue", "due-today", "due-this-week", "no-due-date"]).optional()
        .describe("Filter by due date preset"),
      dueAfter: z.string().optional()
        .describe("Filter tasks due after this date (ISO 8601, e.g. 2026-02-01)"),
      dueBefore: z.string().optional()
        .describe("Filter tasks due before this date (ISO 8601, e.g. 2026-02-28)"),
    },
  },
  async (params) => {
    // Fetch all tasks, then filter in the MCP server
    // (personal board scale, per CONTEXT.md)
    const allTasks = await convex.query(api.mcpApi.listTasks, { token: API_TOKEN });
    let filtered = allTasks;

    if (params.query) {
      const q = params.query.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q))
      );
    }

    if (params.priority) {
      filtered = filtered.filter(t => t.priority === params.priority);
    }

    // ... more filters (AND logic)

    return {
      content: [{
        type: "text",
        text: JSON.stringify(filtered.map(formatTask), null, 2),
      }],
    };
  }
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP+SSE transport | Streamable HTTP transport | 2025 MCP spec | SSE is deprecated for remote; stdio remains standard for local |
| `Server` class (low-level) | `McpServer` class (high-level) | MCP SDK 1.x | Simpler tool registration with Zod schemas |
| Zod v3 (explicit) | Zod v3.25+ (peer dep, SDK imports `zod/v4` internally) | MCP SDK ~1.23 | Must use `zod@3.25+` for compatibility |
| `server.tool()` | `server.registerTool()` | Recent MCP SDK versions | Updated API with richer metadata (title, outputSchema) |

**Deprecated/outdated:**
- HTTP+SSE transport: Use Streamable HTTP for remote, stdio for local
- `@modelcontextprotocol/sdk` v0.x: Use v1.25+ (current stable)

## Open Questions

Things that need resolution during implementation:

1. **Environment Variable Access in Convex Functions**
   - What we know: Convex queries/mutations run in an isolated runtime. Standard `process.env` may not work as in Node.js. Convex has its own environment variable system accessed via `npx convex env set`.
   - What's unclear: Exactly how Convex runtime exposes environment variables to query/mutation handlers. The docs confirm HTTP actions can access `process.env`, but it is unclear if the same is true for queries/mutations in the current Convex version.
   - Recommendation: **Test this first.** If queries/mutations can access Convex env vars via `process.env`, use Pattern 3 (ConvexHttpClient + token-validated public functions). If not, use Pattern 4 (HTTP actions with Bearer token). Both patterns are documented above. A hybrid approach is also viable: use HTTP actions for auth, then call internal queries/mutations.

2. **MCP User ID Mapping**
   - What we know: The token needs to map to a specific Convex user ID (the board owner). The user ID is a Convex `Id<"users">` like `jh7abc123def456`.
   - What's unclear: Whether to hardcode the user ID in an environment variable or look it up from a tokens table.
   - Recommendation: Start with the environment variable approach (`MCP_USER_ID`). A tokens table is overkill for single-user mode. The user can find their ID from the Convex dashboard or a setup script.

3. **MCP Server Build Strategy**
   - What we know: The MCP server is a separate TypeScript project targeting Node.js. The main project uses Vite/bundler moduleResolution.
   - What's unclear: Whether to use a separate `package.json` with its own dependencies, or share the root `node_modules`.
   - Recommendation: Use a separate `mcp-server/package.json` for clean separation. The MCP server has different runtime requirements (Node.js, not browser). Install `@modelcontextprotocol/sdk`, `zod`, and `convex` in the subdirectory. Use a `tsconfig.json` targeting `Node16` module resolution.

4. **delete_task vs archive_task Separation**
   - What we know: Per CONTEXT.md, these are separate tools. Archive uses existing soft delete pattern, delete is permanent removal.
   - What's unclear: The existing backend only has `archiveTask`. A permanent delete mutation needs to be created.
   - Recommendation: Add a `permanentlyDeleteTask` mutation to `convex/tasks.ts` (or `convex/mcpApi.ts`) that actually calls `ctx.db.delete()`. This is new backend functionality needed for MCP.

## Sources

### Primary (HIGH confidence)
- [MCP TypeScript SDK - Build Server](https://modelcontextprotocol.io/docs/develop/build-server) - Full tutorial, TypeScript examples
- [MCP TypeScript SDK - Server Docs](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md) - McpServer API, registerTool, transports
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp) - .mcp.json format, scopes, CLI commands
- [Convex HTTP API](https://docs.convex.dev/http-api/) - API format, authentication methods
- [ConvexHttpClient API](https://docs.convex.dev/api/classes/browser.ConvexHttpClient) - Constructor, query/mutation/action methods
- [Convex HTTP Actions](https://docs.convex.dev/functions/http-actions) - httpAction handlers, running queries from actions
- Existing codebase: `convex/tasks.ts`, `convex/schema.ts`, `convex/http.ts` - Current backend structure

### Secondary (MEDIUM confidence)
- [Convex JavaScript Client Docs](https://docs.convex.dev/client/javascript) - ConvexHttpClient Node.js usage
- [@modelcontextprotocol/sdk npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - Version 1.25.2, peer dependencies
- [Convex Deploy Keys](https://docs.convex.dev/cli/deploy-key-types) - Admin key patterns

### Tertiary (LOW confidence)
- [Convex MCP Server (stack.convex.dev)](https://stack.convex.dev/convex-mcp-server) - Convex's own MCP server pattern (different use case but similar architecture)
- Community patterns for MCP + database integrations - General patterns from web search

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official MCP SDK docs verified, ConvexHttpClient API confirmed
- Architecture: HIGH - Stdio transport is the standard for Claude Code local MCP, well-documented
- Authentication: MEDIUM - Token validation pattern is clear, but exact Convex env var access in queries needs verification
- Pitfalls: HIGH - Stdio logging pitfall is widely documented; Convex ID typing is from codebase analysis

**Research date:** 2026-02-02
**Valid until:** 2026-03-04 (30 days - MCP SDK is stable v1.x, Convex API is stable)
