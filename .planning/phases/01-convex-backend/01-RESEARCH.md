# Phase 1: Convex Backend - Research

**Researched:** 2026-02-02
**Domain:** Convex backend development - schema definition, CRUD operations, indexing, scheduled functions
**Confidence:** HIGH

## Summary

Convex is a backend-as-a-service platform providing TypeScript-first database operations with real-time sync, automatic type generation, and built-in validation. The standard approach for this phase involves defining schemas using validators, implementing CRUD operations as mutations and queries, configuring indexes for performance, and using scheduled functions (cron jobs) for cleanup tasks.

Research focused on the specific requirements from CONTEXT.md: task schema with multiple field types (strings, enums, arrays, timestamps, numeric order), activity history tracking, soft delete patterns, indexing strategy, and scheduled cleanup. Convex provides native support for all these patterns through its validator system, database API, and scheduling infrastructure.

**Primary recommendation:** Use Convex's validator-driven schema with union literals for enums, separate tables for tasks and activity history, compound indexes for query optimization, and scheduled internal mutations for 90-day history cleanup. Leverage `ctx.db.patch()` for partial updates and manual `updatedAt` timestamp management.

## Standard Stack

The established libraries/tools for Convex backend development:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | Latest (1.31.0+) | Core Convex backend framework | Official package, provides database API, validators, scheduling |
| TypeScript | 4.0+ | Type safety | End-to-end type safety from schema to frontend, required for Convex |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| convex-helpers | 0.1.96+ | Utility functions for common patterns | Row-level security, migrations, relationships, rate limiting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Convex validators | Zod + convex-helpers | More verbose but allows sharing validation logic with frontend |
| Manual timestamps | ORM-style auto-timestamps | Convex doesn't have built-in updatedAt, must implement manually |

**Installation:**
```bash
npm install convex
npm install convex-helpers  # Optional but recommended
```

## Architecture Patterns

### Recommended Project Structure
```
convex/
├── schema.ts              # Table definitions with validators
├── tasks.ts               # Task CRUD mutations and queries
├── activityHistory.ts     # Activity tracking mutations
├── crons.ts               # Scheduled cleanup jobs
├── validators/            # Reusable validators (optional)
│   └── enums.ts          # Status, priority validators
└── _generated/           # Auto-generated types (check into git)
```

### Pattern 1: Schema Definition with Validators
**What:** Define tables using `defineSchema` and `defineTable` with field validators
**When to use:** Required for type safety and runtime validation
**Example:**
```typescript
// Source: https://docs.convex.dev/database/schemas
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Define reusable enum validators
export const statusValidator = v.union(
  v.literal("backlog"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("done")
);

export const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent")
);

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: statusValidator,
    priority: priorityValidator,
    tags: v.array(v.string()),
    dueDate: v.optional(v.number()), // timestamp in ms
    order: v.number(),
    archived: v.boolean(), // soft delete flag
    updatedAt: v.number(), // manual timestamp
    // _id and _creationTime are automatic
  })
    .index("by_status", ["status"])
    .index("by_status_order", ["status", "order"])
    .index("by_priority", ["priority"])
    .index("by_dueDate", ["dueDate"])
    .index("by_tags", ["tags"]),

  activity_history: defineTable({
    taskId: v.id("tasks"),
    field: v.string(), // which field changed
    oldValue: v.optional(v.string()), // JSON string for any type
    newValue: v.optional(v.string()),
    userId: v.optional(v.string()), // null until auth implemented
    // _creationTime tracks when change occurred
  })
    .index("by_task", ["taskId"])
    .index("by_task_time", ["taskId", "_creationTime"]),
});
```

### Pattern 2: CRUD Mutations with Validation
**What:** Implement create, update, delete operations using mutation constructor
**When to use:** All data modifications
**Example:**
```typescript
// Source: https://docs.convex.dev/functions/mutation-functions
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { statusValidator, priorityValidator } from "./schema";

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: statusValidator,
    priority: priorityValidator,
    tags: v.array(v.string()),
    dueDate: v.optional(v.number()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate title is non-empty
    if (args.title.trim() === "") {
      throw new Error("Title cannot be empty");
    }

    const taskId = await ctx.db.insert("tasks", {
      ...args,
      archived: false,
      updatedAt: Date.now(),
    });

    // Return full task object
    const task = await ctx.db.get(taskId);
    return task;
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.optional(statusValidator),
      priority: v.optional(priorityValidator),
      tags: v.optional(v.array(v.string())),
      dueDate: v.optional(v.number()),
      order: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Task not found");
    }

    // Track changes in activity history
    for (const [field, newValue] of Object.entries(args.updates)) {
      const oldValue = existing[field];
      if (oldValue !== newValue) {
        await ctx.db.insert("activity_history", {
          taskId: args.id,
          field,
          oldValue: JSON.stringify(oldValue),
          newValue: JSON.stringify(newValue),
          userId: undefined, // TODO: populate from ctx.auth when implemented
        });
      }
    }

    // Partial update using patch
    await ctx.db.patch(args.id, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});
```

### Pattern 3: Queries with Indexes
**What:** Retrieve data efficiently using indexes
**When to use:** All read operations, especially filtered queries
**Example:**
```typescript
// Source: https://docs.convex.dev/database/reading-data/indexes/
import { query } from "./_generated/server";
import { v } from "convex/values";

export const listTasksByStatus = query({
  args: { status: statusValidator },
  handler: async (ctx, args) => {
    // Use index for efficient filtering
    return await ctx.db
      .query("tasks")
      .withIndex("by_status_order", (q) => q.eq("status", args.status))
      .filter((q) => q.eq(q.field("archived"), false)) // Soft delete filter
      .order("asc") // Orders by next field in index (order)
      .collect();
  },
});

export const getTasksWithUpcomingDueDates = query({
  args: { beforeTimestamp: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_dueDate")
      .filter((q) =>
        q.and(
          q.lt(q.field("dueDate"), args.beforeTimestamp),
          q.eq(q.field("archived"), false)
        )
      )
      .collect();
  },
});
```

### Pattern 4: Scheduled Cleanup Functions
**What:** Use cron jobs for periodic maintenance tasks
**When to use:** Data cleanup, batch operations
**Example:**
```typescript
// Source: https://docs.convex.dev/scheduling/cron-jobs
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup daily at 2 AM UTC
crons.daily(
  "cleanup old activity history",
  { hourUTC: 2, minuteUTC: 0 },
  internal.activityHistory.cleanupOldRecords
);

export default crons;

// convex/activityHistory.ts
import { internalMutation } from "./_generated/server";

export const cleanupOldRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

    // Query old records
    const oldRecords = await ctx.db
      .query("activity_history")
      .withIndex("by_task_time")
      .filter((q) => q.lt(q.field("_creationTime"), ninetyDaysAgo))
      .collect();

    // Delete in batches
    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    console.log(`Cleaned up ${oldRecords.length} old activity records`);
  },
});
```

### Pattern 5: Soft Delete with Archive Flag
**What:** Mark records as deleted without removing them
**When to use:** When you need to preserve data or support undelete
**Example:**
```typescript
export const archiveTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      archived: true,
      updatedAt: Date.now(),
    });

    // Track in history
    await ctx.db.insert("activity_history", {
      taskId: args.id,
      field: "archived",
      oldValue: "false",
      newValue: "true",
      userId: undefined,
    });
  },
});

// Always filter archived in queries
export const listActiveTasks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
  },
});
```

### Anti-Patterns to Avoid
- **Don't use nested arrays of objects** - Makes updates difficult, use separate tables with relationships instead
- **Don't call `Date.now()` in queries** - Breaks caching, use it only in mutations
- **Don't use `.collect()` on large result sets** - Use pagination or tighter index filters for 1000+ documents
- **Don't define redundant indexes** - `by_status` is redundant if you have `by_status_order`
- **Don't schedule public functions** - Always use `internal.*` functions for crons to prevent malicious calls
- **Don't skip argument validators** - Required for security, prevents type mismatches at runtime

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Row-level security | Custom authorization logic in every function | convex-helpers/server/rowLevelSecurity | Handles read/insert/modify checks per-document, prevents authorization bugs |
| Rate limiting | Custom counters and timers | convex-helpers rate-limiter component | Handles edge cases, configurable limits, production-tested |
| Migrations | Manual data transformation scripts | convex-helpers/server/migrations | Tracks migration state, supports rollback, idempotent |
| Session tracking | Custom session ID storage | convex-helpers/server/sessions | Handles anonymous users, session persistence, typed session data |
| Relationship traversals | Manual queries for related data | convex-helpers getOneFrom, getManyFrom | Type-safe, optimized queries, handles missing relations |

**Key insight:** Convex's transaction model and reactivity system have subtle edge cases. The convex-helpers library provides battle-tested solutions that handle these correctly.

## Common Pitfalls

### Pitfall 1: Not Awaiting Database Operations
**What goes wrong:** Database operations return promises. Forgetting `await` causes functions to return before operations complete, leading to race conditions or silent failures.
**Why it happens:** TypeScript doesn't enforce await, and mutations may appear to work in testing
**How to avoid:** Always use `await` with `ctx.db.*`, `ctx.scheduler.*`, `ctx.runMutation()`, `ctx.runQuery()`
**Warning signs:** Operations sometimes work, sometimes don't; data appears stale; scheduled functions don't execute

### Pitfall 2: Circular Import Dependencies
**What goes wrong:** Validators become `undefined` at runtime, causing cryptic errors
**Why it happens:** TypeScript allows circular imports during compilation, but values may be undefined at runtime
**How to avoid:** Define shared validators in schema.ts, export from there, never import schema into files that schema imports
**Warning signs:** "undefined is not a function" errors related to validators; validators work in some files but not others

### Pitfall 3: Over-filtering with `.filter()` Instead of Indexes
**What goes wrong:** Loading thousands of documents into memory, filtering in code, then returning a small subset. Wastes bandwidth and slows queries.
**Why it happens:** `.filter()` looks convenient, developers don't realize it counts all results against bandwidth
**How to avoid:** Use `.withIndex()` with range expressions for large datasets, only use `.filter()` for small result sets (<100 docs)
**Warning signs:** Slow query times, high bandwidth usage, queries that degrade as table grows

### Pitfall 4: Manual `updatedAt` Timestamp Forgetting
**What goes wrong:** Some mutations update the `updatedAt` field, others forget, leading to stale timestamps
**Why it happens:** Convex doesn't auto-update timestamps like some ORMs, it's manual every time
**How to avoid:** Create a wrapper helper function for `ctx.db.patch()` that always sets `updatedAt: Date.now()`
**Warning signs:** Some tasks show accurate "last updated" times, others don't; inconsistent timestamp behavior

### Pitfall 5: Redundant Index Proliferation
**What goes wrong:** Creating separate indexes like `by_status` and `by_status_order` when only the compound index is needed. Wastes storage and slows writes.
**Why it happens:** Misunderstanding that an index on `[status, order]` can also query by `status` alone
**How to avoid:** A compound index on `[A, B]` supports queries on `A` alone OR `A and B` together. Only create single-field indexes if never querying that field with others.
**Warning signs:** Many similar indexes; slow write performance; schema review shows redundancy

### Pitfall 6: Public vs Internal Function Confusion
**What goes wrong:** Scheduling or calling public functions internally exposes attack surface, allows malicious calls
**Why it happens:** Public functions work when called internally, so developers don't realize the security risk
**How to avoid:** Mark functions as `internalMutation` or `internalQuery` if they're only called from other Convex functions. Never schedule public functions.
**Warning signs:** Security audit flags public functions with no frontend calls; cron jobs calling public functions

### Pitfall 7: Order Field Gap Management
**What goes wrong:** When reordering tasks via drag-drop, gaps appear in order values (e.g., 1, 2, 5, 8) or numbers grow very large. Eventually requires rebalancing.
**Why it happens:** Simple increment/decrement strategies create gaps; inserting between items uses fractional or large increments
**How to avoid:** Use a spacing algorithm (e.g., order between A and B = (A + B) / 2 for floats) or periodically rebalance all order values to sequential integers
**Warning signs:** Order values exceed millions; precision loss with large floats; gaps in order sequences

## Code Examples

Verified patterns from official sources:

### Extracting TypeScript Types from Validators
```typescript
// Source: https://stack.convex.dev/types-cookbook
import { Infer, v } from "convex/values";
import { statusValidator, priorityValidator } from "./schema";

// Extract type from validator
export type TaskStatus = Infer<typeof statusValidator>;
// Result: "backlog" | "in_progress" | "blocked" | "done"

export type TaskPriority = Infer<typeof priorityValidator>;
// Result: "low" | "medium" | "high" | "urgent"

// Use in frontend code
function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case "backlog": return "gray";
    case "in_progress": return "blue";
    case "blocked": return "red";
    case "done": return "green";
  }
}
```

### Partial Update Validator Pattern
```typescript
// Source: https://docs.convex.dev/functions/validation
import { v } from "convex/values";

// Full task validator
const taskValidator = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  status: statusValidator,
  priority: priorityValidator,
  tags: v.array(v.string()),
  dueDate: v.optional(v.number()),
  order: v.number(),
});

// Partial update validator - all fields optional
const taskUpdateValidator = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  status: v.optional(statusValidator),
  priority: v.optional(priorityValidator),
  tags: v.optional(v.array(v.string())),
  dueDate: v.optional(v.number()),
  order: v.optional(v.number()),
});

// Use in mutation
export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    updates: taskUpdateValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ...args.updates,
      updatedAt: Date.now(),
    });
  },
});
```

### Testing Mutations via Dashboard
```typescript
// Source: https://docs.convex.dev/dashboard
// After running `npx convex dev`, open dashboard at provided URL
// Navigate to Functions tab
// Select `tasks:createTask` function
// Enter JSON arguments:
{
  "title": "Test task",
  "status": "backlog",
  "priority": "medium",
  "tags": ["test"],
  "order": 1
}
// Click "Run" to execute
// Response shows full created task with _id and _creationTime
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual table creation | Schema-driven with validators | Convex v1.0+ | Type safety, validation, auto-generated types |
| String-based function calls | Generated `api.*` imports | Convex v1.0+ | Type-safe function references, no typos |
| Manual type definitions | `Doc<"table">` from schema | Convex v1.0+ | Single source of truth, types match schema |
| Separate file for each function | Multiple exports per file | Current best practice | Better organization, less boilerplate |
| Public-only functions | Internal functions | Convex v1.16+ | Security, scheduled functions can't be called externally |

**Deprecated/outdated:**
- **Running without schemas** - Still works but loses type safety, not recommended for production
- **`undefined` for optional values** - Not a valid Convex value, use `null` or omit field entirely
- **Not specifying table name to `ctx.db.*`** - Required for custom ID generation (future), now recommended

## Open Questions

Things that couldn't be fully resolved:

1. **Order field rebalancing strategy**
   - What we know: Simple spacing algorithms (average between neighbors) work for most cases
   - What's unclear: Optimal threshold for triggering full rebalance; whether to use integers or floats
   - Recommendation: Start with float-based averaging (order = (prevOrder + nextOrder) / 2), implement full rebalance when precision issues arise

2. **Optimal batch size for history cleanup**
   - What we know: Deleting in loops within mutation is transactional
   - What's unclear: Performance threshold for batch size (100? 1000? 10000 records per cron run?)
   - Recommendation: Start with 1000 records per run, monitor function execution time in dashboard, adjust if needed

3. **Activity history value serialization**
   - What we know: Storing old/new values as JSON strings allows any type
   - What's unclear: Whether to store typed fields (separate columns for string/number/boolean) or always use JSON
   - Recommendation: Use JSON.stringify for flexibility, accept that querying specific values requires deserialization

## Sources

### Primary (HIGH confidence)
- [Convex Schemas Documentation](https://docs.convex.dev/database/schemas) - Schema definition, validators, TypeScript integration
- [Convex Validators and Validation](https://docs.convex.dev/functions/validation) - Argument validation, partial updates, security
- [Convex Indexes Documentation](https://docs.convex.dev/database/reading-data/indexes/) - Index best practices, compound indexes, redundancy
- [Convex Cron Jobs](https://docs.convex.dev/scheduling/cron-jobs) - Scheduled function syntax, cleanup patterns
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/) - Anti-patterns, performance optimization
- [Convex Data Types](https://docs.convex.dev/database/types) - Array validation, ID references, null vs optional
- [Convex Writing Data](https://docs.convex.dev/database/writing-data) - Insert, patch, replace, delete operations
- [Types and Validators Cookbook](https://stack.convex.dev/types-cookbook) - Enum patterns, type extraction, reusable validators

### Secondary (MEDIUM confidence)
- [Convex Helpers Library](https://www.npmjs.com/package/convex-helpers) - Row-level security, migrations, relationships (official library)
- [10 Essential Tips for New Convex Developers](https://www.schemets.com/blog/10-convex-developer-tips-pitfalls-productivity) - Common mistakes verified against official docs
- [Convex Project Configuration](https://docs.convex.dev/production/project-configuration) - Setup, folder structure
- [Convex CLI Documentation](https://docs.convex.dev/cli) - npx convex init, dev workflow

### Tertiary (LOW confidence - general patterns, not Convex-specific)
- [Audit Trail Patterns](https://www.datadoghq.com/knowledge-center/audit-logging/) - General activity history best practices (not Convex-specific)
- [Soft Delete Pattern](https://stack.convex.dev/ents) - Convex Ents library approach (alternative to manual implementation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official packages verified through docs and npm
- Architecture: HIGH - All patterns verified through official documentation and code examples
- Pitfalls: HIGH - Cross-referenced official best practices doc with community articles
- Order field pattern: MEDIUM - General drag-drop pattern, not Convex-specific implementation
- History cleanup batch size: LOW - No official guidance, requires performance testing
- convex-helpers features: MEDIUM - Official library but need to verify which features are most relevant

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - Convex is stable, slow-moving release cycle)
