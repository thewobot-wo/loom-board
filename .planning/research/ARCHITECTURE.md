# Architecture Research: Convex Authentication & Assistant Integration

**Project:** Loom Board
**Researched:** 2026-02-02
**Confidence:** MEDIUM (Convex vanilla JS patterns verified via official docs; auth approach requires adaptation)

## Summary

Integrating Convex into Loom Board requires adapting the React-focused Convex Auth library for vanilla JavaScript, using the `ConvexClient.setAuth()` method with a custom token fetcher. The MCP server is straightforward - Convex provides an official MCP server that Claude Code can use directly. The main architectural challenge is handling OAuth flow in a single-file HTML app without a build system.

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Inline CSS (~800 lines)                              │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  HTML Structure (Kanban board, modals, panels)        │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  Inline JavaScript (~600 lines)                       │  │
│  │  - Client-side password check (INSECURE)              │  │
│  │  - Task state management                              │  │
│  │  - Drag & drop handlers                               │  │
│  │  - localStorage persistence                           │  │
│  │  - Import/export JSON                                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  localStorage   │
                    │  (browser-only) │
                    └─────────────────┘
```

**Key characteristics:**
- Zero build system (no npm, no bundler)
- All code in single HTML file
- Data isolated to single browser
- Password hardcoded as plaintext (`'midiwoL00m'`)
- Session auth via `sessionStorage.setItem('loom-auth', 'true')`

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Frontend)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  index.html                                           │  │
│  │  - UI components (unchanged)                          │  │
│  │  - ConvexClient (WebSocket subscription)              │  │
│  │  - Google OAuth via popup                             │  │
│  │  - Token management                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │ WebSocket                    │ OAuth popup
          ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Convex Backend                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │  auth.ts        │  │  tasks.ts       │  │  http.ts    │  │
│  │  - OAuth config │  │  - CRUD ops     │  │  - Callback │  │
│  │  - Session mgmt │  │  - User scoped  │  │  - Token    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                              │                              │
│                              ▼                              │
│                    ┌─────────────────┐                      │
│                    │  Convex Tables  │                      │
│                    │  - users        │                      │
│                    │  - tasks        │                      │
│                    │  - history      │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
          ▲
          │ MCP Protocol (stdio)
          │
┌─────────────────────────────────────────────────────────────┐
│                     Local Machine                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Claude Code                                          │  │
│  │  └─► convex-mcp-server (npx convex mcp start)         │  │
│  │      - Read tasks via runOneoffQuery                  │  │
│  │      - Modify tasks via run (calls mutations)         │  │
│  │      - Uses developer's Convex credentials            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Convex Auth Flow with Google OAuth

**Challenge:** Convex Auth library is React-focused. The vanilla JS client (`ConvexClient`) supports authentication via `setAuth()` but requires you to provide a token fetcher.

**Solution Options:**

#### Option A: Minimal Vanilla JS Adaptation (RECOMMENDED)

Use Convex Auth backend with a custom frontend flow:

```javascript
// 1. Trigger OAuth via Convex HTTP action
function signInWithGoogle() {
  // Open popup to Convex OAuth endpoint
  const popup = window.open(
    `${CONVEX_SITE_URL}/api/auth/signin/google?` +
    `redirect=${encodeURIComponent(window.location.origin + '/callback.html')}`,
    'oauth',
    'width=500,height=600'
  );

  // Listen for callback
  window.addEventListener('message', handleOAuthCallback);
}

// 2. Callback page extracts tokens and posts to parent
// callback.html receives tokens in URL hash/query

// 3. Configure ConvexClient with token
const client = new ConvexClient(CONVEX_URL);
client.setAuth(
  async () => {
    const token = localStorage.getItem('convex_token');
    return token || null;
  },
  (isAuthenticated) => {
    if (isAuthenticated) {
      renderApp();
    } else {
      renderLoginScreen();
    }
  }
);
```

**Token refresh:** Convex Auth uses refresh tokens stored in cookies. The `setAuth` callback is called automatically when tokens expire. You need to re-fetch from the Convex `/api/auth/session` endpoint.

#### Option B: Third-Party Auth (Auth0/Clerk)

Use Auth0's vanilla JS SDK with Convex token validation. More complex setup but better documented for non-React.

**Recommendation:** Option A - adapting Convex Auth is feasible and keeps everything in one system. The backend setup is identical to React; only the frontend token handling differs.

### 2. Convex from Vanilla JavaScript

**Official Support:** Convex explicitly supports vanilla JS via `ConvexClient` from `convex/browser`.

```javascript
// Import via CDN (no build system)
import { ConvexClient } from 'https://esm.sh/convex/browser';

const client = new ConvexClient('https://your-deployment.convex.cloud');

// Subscribe to tasks (real-time updates)
client.onUpdate(
  { path: 'tasks:list' }, // Using anyApi pattern
  { userId: currentUserId },
  (tasks) => {
    renderTasks(tasks);
  }
);

// Create task
await client.mutation(
  { path: 'tasks:create' },
  {
    title: 'New task',
    status: 'backlog',
    priority: 'p1'
  }
);
```

**CDN Import Pattern:**
Since Loom Board has no build system, use ES modules from CDN:

```html
<script type="module">
  import { ConvexClient } from 'https://esm.sh/convex@1.31/browser';
  // ... app code
</script>
```

**Important:** Without TypeScript/bundler, you lose type safety. Use `anyApi` pattern or string-based function paths.

### 3. MCP Server Integration

**Convex provides an official MCP server.** No custom MCP server needed.

**Setup for Claude Code:**
```bash
claude mcp add-json convex '{"type":"stdio","command":"npx","args":["convex","mcp","start"]}'
```

**Available Tools for Claude:**
| Tool | Purpose | Use Case |
|------|---------|----------|
| `status` | List deployments | Find the Loom Board deployment |
| `tables` | List all tables | Discover schema |
| `data` | Read table contents | View tasks |
| `runOneoffQuery` | Execute read-only JS queries | Complex task queries |
| `run` | Execute deployed functions | Create/update/delete tasks |
| `logs` | View function execution logs | Debug issues |

**Authentication:** The MCP server uses the developer's Convex credentials (from `npx convex login`). It does NOT use the app's Google OAuth - it's developer-level access.

**Same Repo vs Separate:**
- **Same repo (RECOMMENDED):** The MCP server reads from `.env.local` to find the deployment. Keep Convex config in the Loom Board repo.
- **Separate:** Would require manual deployment URL configuration.

**MCP Server Configuration Options:**
```bash
# Development deployment (default)
npx convex mcp start

# Specific project directory
npx convex mcp start --project-dir /path/to/loom-board

# Production (requires explicit flag for safety)
npx convex mcp start --prod --dangerously-enable-production-deployments
```

### 4. Data Layer: localStorage to Convex Migration

**Current Data Structure (localStorage):**
```javascript
{
  tasks: [
    {
      id: "1706745600000",
      title: "Task title",
      description: "Details",
      status: "backlog", // backlog | in-progress | blocked | done
      tag: "project",    // project | research | bug | feature | maintenance | cruise
      priority: "p1",    // p0 | p1 | p2 | p3
      dueDate: "2026-02-15",
      blockedReason: null,
      createdAt: 1706745600000,
      startedAt: null,
      completedAt: null,
      archived: false
    }
  ],
  history: [
    {
      timestamp: 1706745600000,
      time: "2026-02-01T10:00:00.000Z",
      action: "Created",
      task: "Task title"
    }
  ]
}
```

**Convex Schema (`convex/schema.ts`):**
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Convex Auth manages this automatically
  users: defineTable({
    // Managed by Convex Auth
  }),

  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("backlog"),
      v.literal("in-progress"),
      v.literal("blocked"),
      v.literal("done")
    ),
    tag: v.union(
      v.literal("project"),
      v.literal("research"),
      v.literal("bug"),
      v.literal("feature"),
      v.literal("maintenance"),
      v.literal("cruise")
    ),
    priority: v.union(
      v.literal("p0"),
      v.literal("p1"),
      v.literal("p2"),
      v.literal("p3")
    ),
    dueDate: v.optional(v.string()),
    blockedReason: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    archived: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  history: defineTable({
    userId: v.id("users"),
    action: v.string(),
    taskTitle: v.string(),
  })
    .index("by_user", ["userId"]),
});
```

**Migration Strategy:**

1. **One-time import:** Add a "Migrate from localStorage" button that:
   - Reads existing localStorage data
   - Calls a Convex mutation to bulk-insert tasks
   - Clears localStorage after successful migration

2. **Graceful fallback:** If user isn't authenticated, show read-only localStorage data with prompt to sign in.

```javascript
// Migration mutation (convex/tasks.ts)
export const migrateFromLocalStorage = mutation({
  args: {
    tasks: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      status: v.string(),
      tag: v.string(),
      priority: v.string(),
      dueDate: v.optional(v.string()),
      blockedReason: v.optional(v.string()),
      createdAt: v.number(),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      archived: v.boolean(),
    })),
  },
  handler: async (ctx, { tasks }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    for (const task of tasks) {
      await ctx.db.insert("tasks", {
        userId: user._id,
        ...task,
      });
    }
  },
});
```

## Suggested Build Order

### Phase 1: Convex Backend Setup
**Goal:** Get Convex working with basic CRUD before touching auth.

1. Initialize Convex project (`npx convex init`)
2. Define schema (`convex/schema.ts`)
3. Create task CRUD functions (`convex/tasks.ts`)
4. Test with Convex dashboard

**Deliverable:** Working backend, testable via dashboard.

### Phase 2: Vanilla JS Client Integration
**Goal:** Replace localStorage with Convex (no auth yet, single-user).

1. Add ConvexClient via CDN to index.html
2. Replace `saveData()` with Convex mutations
3. Replace `loadData()` with Convex subscription
4. Test real-time sync

**Deliverable:** App works with Convex, data persists across browsers.

### Phase 3: Google OAuth via Convex Auth
**Goal:** Add authentication, scope tasks to user.

1. Configure Convex Auth backend (auth.ts, http.ts)
2. Set up Google OAuth in Google Cloud Console
3. Implement login UI (replace password gate)
4. Implement token fetching for ConvexClient
5. Add userId filtering to task queries

**Deliverable:** Only authenticated user sees their tasks.

### Phase 4: MCP Server Integration
**Goal:** Enable Claude Code to read/write tasks.

1. Configure Convex MCP server in Claude Code
2. Test read operations (status, tables, data)
3. Test write operations (run mutations)
4. Document MCP tool usage patterns

**Deliverable:** Claude Code can manage tasks via MCP.

### Phase 5: Migration & Cleanup
**Goal:** Smooth transition for existing users.

1. Add localStorage migration flow
2. Remove old password gate code
3. Handle edge cases (offline, token expiry)
4. Update export/import for new format

**Deliverable:** Production-ready with migration path.

## Files to Create/Modify

### New Files (Convex Backend)

| File | Purpose |
|------|---------|
| `convex/schema.ts` | Database schema definition |
| `convex/tasks.ts` | Task CRUD mutations and queries |
| `convex/history.ts` | Activity history mutations and queries |
| `convex/auth.ts` | Convex Auth configuration |
| `convex/auth.config.ts` | Auth provider settings |
| `convex/http.ts` | HTTP routes for OAuth callbacks |
| `convex/tsconfig.json` | TypeScript config for Convex |
| `.env.local` | Convex deployment URL |

### Modified Files

| File | Changes |
|------|---------|
| `index.html` | Replace localStorage with ConvexClient, add Google sign-in UI |
| `package.json` | Add convex dependency (for dev tooling) |

### New Files (Optional)

| File | Purpose |
|------|---------|
| `callback.html` | OAuth callback handler (if popup approach) |

## Architecture Patterns

### Real-time Sync Pattern
```javascript
// Subscribe to tasks - UI updates automatically
client.onUpdate(api.tasks.list, { userId }, (tasks) => {
  this.tasks = tasks;
  this.render();
});
```

### Optimistic Updates Pattern
Since vanilla `ConvexClient` doesn't support optimistic updates, use immediate UI feedback:
```javascript
async function moveTask(taskId, newStatus) {
  // Update UI immediately
  const task = tasks.find(t => t.id === taskId);
  task.status = newStatus;
  render();

  // Then sync to Convex
  try {
    await client.mutation(api.tasks.updateStatus, { taskId, status: newStatus });
  } catch (e) {
    // Rollback on failure
    task.status = oldStatus;
    render();
    showToast('Failed to update', 'error');
  }
}
```

### Auth State Pattern
```javascript
let isAuthenticated = false;
let currentUser = null;

client.setAuth(
  fetchToken,
  (authenticated) => {
    isAuthenticated = authenticated;
    if (authenticated) {
      showApp();
    } else {
      showLogin();
    }
  }
);
```

## Anti-Patterns to Avoid

### 1. Storing JWT in localStorage
**Problem:** XSS vulnerability - any script can read the token.
**Solution:** Use httpOnly cookies (Convex Auth does this) or sessionStorage with short-lived tokens.

### 2. Calling Convex functions by string path without validation
**Problem:** Typos cause runtime errors, no IDE help.
**Solution:** Even in vanilla JS, create a constants file:
```javascript
const API = {
  tasks: {
    list: { path: 'tasks:list' },
    create: { path: 'tasks:create' },
    update: { path: 'tasks:update' },
  }
};
```

### 3. Not handling WebSocket disconnection
**Problem:** User makes changes while disconnected, data loss.
**Solution:** Subscribe to connection state:
```javascript
client.subscribeToConnectionState((state) => {
  if (state === 'Disconnected') {
    showOfflineBanner();
  }
});
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Convex Auth vanilla JS adaptation | Medium | High | Test OAuth flow early in Phase 3 |
| CDN import compatibility | Low | Medium | Fallback to bundler if needed |
| Token refresh handling | Medium | Medium | Test long sessions |
| MCP permissions | Low | Low | MCP uses dev credentials, not user OAuth |

## Sources

**Convex Official Documentation (HIGH confidence):**
- [Convex JavaScript Client](https://docs.convex.dev/client/javascript)
- [ConvexClient API](https://docs.convex.dev/api/classes/browser.ConvexClient)
- [Convex MCP Server](https://docs.convex.dev/ai/convex-mcp-server)
- [Convex Schemas](https://docs.convex.dev/database/schemas)
- [Convex Auth](https://docs.convex.dev/auth/convex-auth)

**Convex Auth Labs (MEDIUM confidence - beta feature):**
- [Google OAuth Setup](https://labs.convex.dev/auth/config/oauth/google)
- [Manual Setup](https://labs.convex.dev/auth/setup/manual)

**Community/Blog (MEDIUM confidence):**
- [Convex MCP Server Announcement](https://stack.convex.dev/convex-mcp-server)
- [Introducing Convex Auth](https://stack.convex.dev/convex-auth)

## Open Questions

1. **Token refresh in vanilla JS:** How exactly does Convex Auth surface refresh tokens outside React hooks? May need to call `/api/auth/session` endpoint directly.

2. **CDN bundle size:** The full Convex client may be large. Consider lazy loading or checking if a minimal auth-only bundle exists.

3. **Offline support:** Current app works offline with localStorage. Convex requires connection. Need to decide: require online, or implement offline queue?
