# Phase 5: Migration - Research

**Researched:** 2026-02-03
**Domain:** localStorage-to-Convex data migration, React modal UI, Convex mutations
**Confidence:** HIGH

## Summary

This phase migrates task data from the original single-file HTML app's localStorage format into the Convex backend. Research focused on three areas: (1) understanding the exact localStorage data format from the v1.0 HTML app and how it differs from the current Convex schema, (2) Convex mutation patterns for batch inserts, and (3) React modal + toast patterns for the migration UX.

The localStorage data lives under the key `loom-tasks` as a JSON object `{ tasks: [...], history: [...] }`. Critical schema differences exist between the old format and the Convex schema: status uses `in-progress` (hyphen) vs `in_progress` (underscore), priority uses `p0/p1/p2/p3` vs `urgent/high/medium/low`, the old format has a singular `tag` string vs the `tags` array, and `dueDate` is a date string (`"YYYY-MM-DD"`) vs a timestamp number. The migration must map all of these.

Convex supports batch inserts via a loop within a single mutation (up to 16,000 documents, 16 MiB, 1 second execution), which is more than sufficient for a personal task board. The migration mutation should be a standard (not internal) mutation that uses `getAuthUserId` for authentication, accepts an array of pre-validated task objects, and inserts them in a loop with activity history entries. The React side handles localStorage reading, validation, and data transformation before calling the mutation.

**Primary recommendation:** Create a dedicated `convex/migration.ts` with a `migrateLocalTasks` mutation that accepts an array of transformed tasks, and a `MigrationModal` React component that reads localStorage, validates/transforms data, and calls the mutation with progress tracking via Sonner toast ID updates.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| convex | ^1.31.7 | Backend mutation for batch task insertion | Already in stack, native transaction support |
| react | ^19.2.4 | Migration modal component | Already in stack |
| sonner | ^2.0.7 | Progress toast notifications | Already in stack, supports toast ID updates |
| clsx | (existing) | Conditional CSS classes for modal | Already in stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS Modules | (built-in) | Modal styling | Consistent with all other components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side transformation | Server-side transformation | Client-side is simpler: read localStorage (browser-only API), transform, send clean data to Convex |
| Single batch mutation | Individual mutations per task | Single mutation is atomic and faster; individual calls create separate transactions |

**Installation:**
No new packages needed. All libraries already in the project.

## Architecture Patterns

### Recommended Project Structure
```
convex/
  migration.ts          # migrateLocalTasks mutation (batch insert)
src/
  components/
    Migration/
      MigrationModal.tsx      # Modal dialog for migration prompt
      MigrationModal.module.css  # Styling (matches TaskModal pattern)
      index.ts                # Barrel export
  lib/
    migration.ts         # localStorage reading, validation, transformation utils
```

### Pattern 1: Client-Side Transformation, Server-Side Insertion
**What:** Read and transform localStorage data on the client, send clean Convex-compatible objects to a server mutation
**When to use:** Always for this migration (localStorage is a browser-only API)
**Why:** Convex mutations run on the server and cannot access browser localStorage. The client must read, validate, and transform the data before sending it to Convex.

```typescript
// src/lib/migration.ts - Client-side data transformation

interface LocalStorageTask {
  id: string;
  title: string;
  description?: string;
  status: string;        // "backlog" | "in-progress" | "blocked" | "done"
  priority: string;      // "p0" | "p1" | "p2" | "p3"
  tag: string;           // singular string: "project", "research", etc.
  dueDate?: string;      // "YYYY-MM-DD" date string or empty
  createdAt?: number;    // timestamp in ms
  archived?: boolean;
  blockedReason?: string | null;
  startedAt?: number;
  completedAt?: number;
  blockedSince?: number;
}

const STATUS_MAP: Record<string, string> = {
  "backlog": "backlog",
  "in-progress": "in_progress",
  "blocked": "blocked",
  "done": "done",
};

const PRIORITY_MAP: Record<string, string> = {
  "p0": "urgent",
  "p1": "high",
  "p2": "medium",
  "p3": "low",
};

function transformTask(task: LocalStorageTask, order: number) {
  return {
    title: task.title,
    description: task.description || undefined,
    status: STATUS_MAP[task.status] ?? "backlog",
    priority: PRIORITY_MAP[task.priority] ?? "medium",
    tags: task.tag ? [task.tag] : ["project"],
    dueDate: task.dueDate ? new Date(task.dueDate).getTime() : undefined,
    order,
    createdAt: task.createdAt ?? Date.now(),
    updatedAt: task.createdAt ?? Date.now(),
  };
}
```

### Pattern 2: Migration Mutation with Auth and Activity History
**What:** A standard Convex mutation that inserts multiple tasks in a loop and creates activity history entries
**When to use:** For the actual Convex insert

```typescript
// convex/migration.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const migrateLocalTasks = mutation({
  args: {
    tasks: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      status: v.string(),       // already mapped to Convex format
      priority: v.string(),     // already mapped to Convex format
      tags: v.array(v.string()),
      dueDate: v.optional(v.number()),
      order: v.number(),
      createdAt: v.number(),    // preserved from localStorage
      updatedAt: v.number(),    // preserved from localStorage
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const results = [];
    for (const task of args.tasks) {
      const taskId = await ctx.db.insert("tasks", {
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as any,
        tags: task.tags,
        dueDate: task.dueDate,
        order: task.order,
        archived: false,
        updatedAt: task.updatedAt,
        userId,
      });
      // Single migration activity entry per task
      await ctx.db.insert("activity_history", {
        taskId,
        field: "_migrated",
        oldValue: undefined,
        newValue: JSON.stringify({ source: "localStorage", title: task.title }),
        userId: userId.toString(),
      });
      results.push(taskId);
    }
    return { imported: results.length };
  },
});
```

### Pattern 3: Migration Modal with Progress via Sonner Toast ID
**What:** Update a single toast in-place using a consistent `id` parameter
**When to use:** For the "Importing task 3 of 12..." progress indicator

```typescript
// Source: sonner.emilkowal.ski/toast (verified)
import { toast } from "sonner";

// Create loading toast with fixed ID
toast.loading("Importing task 1 of 12...", { id: "migration-progress" });

// Update in place by reusing the same ID
toast.loading("Importing task 3 of 12...", { id: "migration-progress" });

// Replace with success when done
toast.success("Imported 12 tasks successfully", { id: "migration-progress" });
```

### Pattern 4: One-Chance Migration Flag in localStorage
**What:** Set a flag after migration/skip to prevent re-prompting
**When to use:** After migration completes or user clicks Skip

```typescript
const MIGRATION_FLAG_KEY = "loom-migration-complete";

function hasMigrated(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === "true";
}

function markMigrated(): void {
  localStorage.setItem(MIGRATION_FLAG_KEY, "true");
}
```

### Anti-Patterns to Avoid
- **Calling individual mutations per task from React:** Creates separate transactions per task, much slower, and prevents atomic rollback. Use a single batch mutation instead.
- **Transforming data on the server:** Convex mutations cannot access localStorage. All reading and transformation must happen client-side.
- **Using `internalMutation` for migration:** The migration is triggered from the authenticated React client, so use a standard `mutation` with `getAuthUserId` (not an internal function).
- **Storing migration state in Convex:** Use localStorage flags for migration state since the migration is a per-browser event, not a per-account event.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast progress updates | Custom progress component | Sonner toast with `id` parameter | Built-in toast update-by-ID; already in the project |
| Schema validation | Custom deep-object validator | TypeScript type guards + simple checks | Only 6-7 fields to validate; no need for Zod/Yup |
| Batch insert | Custom queueing/retry system | Single Convex mutation with loop | Convex transactions are atomic up to 16,000 docs |
| Modal overlay | Custom overlay component | Reuse existing TaskModal CSS pattern | overlay, modal, header, body, footer classes already exist |

**Key insight:** This migration is deliberately simple (one-time, personal use, likely <50 tasks). The complexity is in data mapping correctness, not infrastructure.

## Common Pitfalls

### Pitfall 1: Status Format Mismatch (`in-progress` vs `in_progress`)
**What goes wrong:** Migrated tasks have invalid status values that Convex rejects or that queries miss
**Why it happens:** The old HTML app uses `in-progress` (hyphen) while the Convex schema uses `in_progress` (underscore)
**How to avoid:** Explicit STATUS_MAP mapping in the transformation layer; validate after mapping
**Warning signs:** Convex schema validation errors on insert; tasks disappearing from board columns

### Pitfall 2: Priority Format Mismatch (`p0/p1/p2/p3` vs `urgent/high/medium/low`)
**What goes wrong:** Tasks imported with invalid priority values
**Why it happens:** The old HTML app uses short codes (`p0`, `p1`, `p2`, `p3`) while Convex uses descriptive names (`urgent`, `high`, `medium`, `low`)
**How to avoid:** Explicit PRIORITY_MAP mapping; fallback to `"medium"` for unknown values
**Warning signs:** Convex schema validation errors on insert

### Pitfall 3: Tag Singular vs Array (`tag: "project"` vs `tags: ["project"]`)
**What goes wrong:** Type mismatch causes insert failure
**Why it happens:** Old format stores a single `tag` string; Convex schema expects `tags` as `v.array(v.string())`
**How to avoid:** Wrap singular tag in array: `tags: task.tag ? [task.tag] : ["project"]`
**Warning signs:** Convex validator error on `tags` field

### Pitfall 4: DueDate Format Mismatch (string vs number)
**What goes wrong:** Due dates are NaN or wrong
**Why it happens:** Old format stores `dueDate` as `"YYYY-MM-DD"` string from `input[type="date"]`; Convex expects `v.number()` timestamp in ms
**How to avoid:** Convert with `new Date(task.dueDate).getTime()`; check for NaN; skip if invalid
**Warning signs:** NaN values in Convex; incorrect due date display

### Pitfall 5: Mutation Called Before Auth Ready
**What goes wrong:** Migration mutation fails with "Not authenticated"
**Why it happens:** Migration modal rendered before Convex auth state is fully resolved
**How to avoid:** Only render MigrationModal inside `<Authenticated>` wrapper (it's already inside BoardContent which is inside Authenticated)
**Warning signs:** "Not authenticated" errors on migration attempt

### Pitfall 6: Forgetting to Preserve createdAt Timestamps
**What goes wrong:** All migrated tasks show "just now" as creation time
**Why it happens:** Convex `_creationTime` is set automatically on insert and cannot be overridden. The original `createdAt` from localStorage is lost.
**How to avoid:** Accept that `_creationTime` will reflect the migration time. Preserve the original `createdAt` in the `updatedAt` field as a proxy, and note this in the migration activity entry. Alternatively, add a `migratedCreatedAt` field -- but this would require a schema change. The simplest approach: set `updatedAt` to the original `createdAt` value so sorting by updatedAt preserves relative ordering.
**Warning signs:** All tasks sorted to the top of "recently updated"

### Pitfall 7: Empty or Null localStorage Data
**What goes wrong:** Migration runs on undefined/null data, causing errors
**Why it happens:** localStorage.getItem returns null when key doesn't exist; JSON.parse(null) throws
**How to avoid:** Null-check before JSON.parse; validate that parsed data has expected shape before proceeding
**Warning signs:** Uncaught TypeError in migration code

## Code Examples

### Reading and Validating localStorage Data
```typescript
// Source: codebase analysis of loom-board.html localStorage format

const LOOM_TASKS_KEY = "loom-tasks";

interface LocalStorageData {
  tasks: LocalStorageTask[];
  history: unknown[];
}

function readLocalStorageTasks(): LocalStorageTask[] | null {
  try {
    const raw = localStorage.getItem(LOOM_TASKS_KEY);
    if (!raw) return null;

    const data: LocalStorageData = JSON.parse(raw);
    if (!data.tasks || !Array.isArray(data.tasks)) return null;

    return data.tasks;
  } catch {
    return null;
  }
}
```

### V1.0 Schema Validation
```typescript
// Validate that a task object matches the expected v1.0 format
const VALID_OLD_STATUSES = ["backlog", "in-progress", "blocked", "done"];
const VALID_OLD_PRIORITIES = ["p0", "p1", "p2", "p3"];
const VALID_OLD_TAGS = ["project", "research", "bug", "feature", "maintenance", "cruise"];

function isValidV1Task(task: unknown): task is LocalStorageTask {
  if (!task || typeof task !== "object") return false;
  const t = task as Record<string, unknown>;

  // Required fields
  if (typeof t.id !== "string") return false;
  if (typeof t.title !== "string" || t.title.trim() === "") return false;
  if (typeof t.status !== "string" || !VALID_OLD_STATUSES.includes(t.status)) return false;

  // Optional fields with type checks
  if (t.description !== undefined && typeof t.description !== "string") return false;
  if (t.priority !== undefined && typeof t.priority !== "string") return false;
  if (t.tag !== undefined && typeof t.tag !== "string") return false;
  if (t.archived !== undefined && typeof t.archived !== "boolean") return false;
  if (t.createdAt !== undefined && typeof t.createdAt !== "number") return false;

  return true;
}
```

### Full Migration Flow
```typescript
// In MigrationModal component (client-side)
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";

const TOAST_ID = "migration-progress";

async function handleMigrate() {
  const rawTasks = readLocalStorageTasks();
  if (!rawTasks) return;

  // Filter: active tasks only, valid schema only
  const validTasks = rawTasks
    .filter(isValidV1Task)
    .filter(t => !t.archived);

  const totalCount = rawTasks.filter(t => !t.archived).length;
  const skippedCount = totalCount - validTasks.length;

  // Transform to Convex format
  const transformedTasks = validTasks.map((task, index) =>
    transformTask(task, index)
  );

  // Show progress
  toast.loading(`Importing task 1 of ${transformedTasks.length}...`, { id: TOAST_ID });

  try {
    const result = await migrateLocalTasks({ tasks: transformedTasks });

    // Success toast
    if (skippedCount > 0) {
      toast.success(
        `Imported ${result.imported} of ${totalCount} tasks`,
        { id: TOAST_ID }
      );
    } else {
      toast.success(
        `Imported ${result.imported} tasks successfully`,
        { id: TOAST_ID }
      );
    }

    // Cleanup
    localStorage.removeItem(LOOM_TASKS_KEY);
    markMigrated();
  } catch (error) {
    toast.error("Migration failed. Please try again.", { id: TOAST_ID });
  }
}
```

### MigrationModal Integration Point in App.tsx
```typescript
// Inside BoardContent (already within <Authenticated>)
function BoardContent() {
  const [showMigration, setShowMigration] = useState(false);

  useEffect(() => {
    // Check on mount: has localStorage data AND hasn't migrated yet
    if (!hasMigrated()) {
      const tasks = readLocalStorageTasks();
      if (tasks && tasks.filter(t => !t.archived).length > 0) {
        setShowMigration(true);
      } else {
        // No data to migrate, set flag to prevent future checks
        markMigrated();
      }
    }
  }, []);

  // ... existing BoardContent code ...

  return (
    <main>
      {showMigration && (
        <MigrationModal
          onComplete={() => setShowMigration(false)}
          onSkip={() => {
            markMigrated();
            setShowMigration(false);
          }}
        />
      )}
      {/* ... existing content ... */}
    </main>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `loom-tasks` localStorage key with flat `{ tasks, history }` | Convex database with typed schema | v1.1 (current project) | All data mapping must account for format differences |
| `in-progress` (hyphen) status | `in_progress` (underscore) status | v1.1 schema design | Explicit mapping required |
| `p0/p1/p2/p3` priorities | `urgent/high/medium/low` priorities | v1.1 schema design | Explicit mapping required |
| Singular `tag` string | `tags` array | v1.1 schema design | Wrap in array |
| `dueDate` as `"YYYY-MM-DD"` string | `dueDate` as timestamp number (ms) | v1.1 schema design | Date parsing required |

**Deprecated/outdated:**
- The old `loom-board.html` password gate: removed in v1.1, replaced by Google OAuth
- localStorage persistence: fully replaced by Convex backend

## Open Questions

1. **Whether to import when Convex already has tasks (Claude's Discretion)**
   - What we know: User decision says "No dedup logic needed -- user is unlikely to have created Convex tasks before migration"
   - Recommendation: Always allow import regardless of existing Convex tasks. The user made this decision explicitly. Just import -- no conflict check needed.

2. **Progress indicator implementation (Claude's Discretion)**
   - What we know: Sonner supports toast.loading with ID-based updates; user wants "Importing task 3 of 12..."
   - What's unclear: Whether to show progress inline in the modal or via toast
   - Recommendation: Use inline progress text in the modal body (simpler, more visible) during the import, then show the success/result as a Sonner toast after the modal closes. The mutation is a single atomic call so there is no per-task progress from the server -- show a loading state in the modal with the count, then the toast for the result.

3. **Convex `_creationTime` cannot be overridden**
   - What we know: Convex auto-sets `_creationTime` on insert. We cannot set it to the original localStorage `createdAt`.
   - Recommendation: Store the original `createdAt` timestamp as `updatedAt` to preserve relative time ordering. The activity history entry records the migration event with the original creation context. This is an acceptable tradeoff for a one-time migration.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `loom-board.html` (git show HEAD:loom-board.html) - localStorage format, task shape, field names
- Codebase analysis: `convex/schema.ts` - Convex schema definition with validators
- Codebase analysis: `convex/tasks.ts` - Existing mutation patterns
- Codebase analysis: `convex/mcpApi.ts` - Internal mutation pattern for reference
- Codebase analysis: `src/App.tsx` - Auth wrapper pattern, BoardContent structure
- Codebase analysis: `src/components/Task/TaskModal.tsx` - Modal pattern, CSS modules, sonner usage
- [Convex Writing Data docs](https://docs.convex.dev/database/writing-data) - Batch insert via loop in mutation
- [Convex Transaction Limits](https://docs.convex.dev/production/state/limits) - 16,000 docs, 16 MiB, 1s execution
- [Sonner toast API](https://sonner.emilkowal.ski/toast) - toast.loading, toast.success, ID-based updates

### Secondary (MEDIUM confidence)
- [Convex Stateful Migrations guide](https://stack.convex.dev/migrating-data-with-mutations) - Migration patterns (for reference, not directly applicable to client-to-server migration)
- [Convex Mutation Functions docs](https://docs.convex.dev/functions/mutation-functions) - useMutation, async return, retry semantics

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in the project, no new dependencies
- Architecture: HIGH - Patterns directly derived from existing codebase (TaskModal, useMutation, toast)
- Data mapping: HIGH - Verified by reading actual source code of both old HTML and current Convex schema
- Pitfalls: HIGH - Derived from direct comparison of old vs new data formats in actual source code

**Research date:** 2026-02-03
**Valid until:** 2026-03-05 (30 days - stable, one-time migration feature)
