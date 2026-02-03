# Phase 2: React Frontend - Research

**Researched:** 2026-02-02
**Domain:** React + Convex + dnd-kit Kanban Board
**Confidence:** HIGH

## Summary

This phase converts the existing vanilla JS Kanban app (loom-board.html with ~1600 lines of inline JS/CSS) to a React application with Convex integration. The existing Convex backend (Phase 1) provides CRUD mutations, queries, and activity history that the React frontend will consume via useQuery/useMutation hooks.

The standard approach is: Vite + React 18 + TypeScript with dnd-kit for drag-and-drop, CSS modules for styling, Convex React hooks for real-time data, and optimistic updates for drag operations. The architecture follows feature-based folders with co-located CSS modules as specified in CONTEXT.md decisions.

Key considerations: dnd-kit has documented performance issues with >50 items (re-renders on every interaction), but our 4-column kanban with typical task counts (~30-50 total) should be manageable. Convex's real-time subscriptions eliminate manual data synchronization. Optimistic updates via `withOptimisticUpdate` provide instant drag feedback.

**Primary recommendation:** Use dnd-kit with @dnd-kit/sortable for multi-container kanban, Sonner for toasts, clsx for conditional CSS module classes, and react-hotkeys-hook for keyboard shortcuts.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^18.3.x | UI framework | Required for Convex React hooks |
| react-dom | ^18.3.x | DOM rendering | Pairs with React |
| @dnd-kit/core | ^6.x | Drag-and-drop foundation | Modern, accessible, performant DnD |
| @dnd-kit/sortable | ^8.x | Sortable lists/containers | Built-in multi-container support |
| @dnd-kit/utilities | ^3.x | CSS transform helpers | Official utilities for transforms |
| convex | ^1.31.x (installed) | Backend client + React hooks | Already integrated in Phase 1 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | ^2.x | Conditional class names | CSS modules with dynamic states |
| sonner | ^2.x | Toast notifications | Error/success feedback |
| react-hotkeys-hook | ^4.x | Keyboard shortcuts | Escape to close modal, Cmd+Enter to save |

### Dev Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite | ^6.x | Build system | Fast dev server, HMR, production builds |
| @vitejs/plugin-react | ^4.x | React support | JSX, Fast Refresh |
| vite-tsconfig-paths | ^5.x | Path aliases | Single config in tsconfig.json |
| typescript | ^5.x | Type checking | Strict mode per CONTEXT.md |
| vitest | ^3.x | Unit testing | Fast, Vite-native testing |
| @testing-library/react | ^16.x | Component testing | User-centric test patterns |
| @testing-library/jest-dom | ^6.x | DOM matchers | toBeInTheDocument, toHaveClass |
| jsdom | ^25.x | Test environment | DOM simulation for Vitest |
| eslint | ^9.x | Linting | Flat config format |
| eslint-config-prettier | ^10.x | Disable conflicting rules | ESLint + Prettier harmony |
| prettier | ^3.x | Formatting | Consistent code style |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dnd-kit | react-beautiful-dnd | Deprecated by Atlassian, no longer maintained |
| dnd-kit | pragmatic-drag-and-drop | Newer Atlassian lib, less React-specific docs |
| Sonner | react-hot-toast | Both good; Sonner is 2KB smaller, shadcn-friendly |
| clsx | classnames | clsx is 239B vs classnames ~400B, same API |

**Installation:**
```bash
# Core dependencies
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities clsx sonner react-hotkeys-hook

# Dev dependencies
npm install -D vite @vitejs/plugin-react vite-tsconfig-paths typescript @types/node
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install -D eslint @eslint/js eslint-config-prettier typescript-eslint prettier
npm install -D eslint-plugin-react-hooks eslint-plugin-react-refresh
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── Board/
│   │   ├── Board.tsx
│   │   ├── Board.module.css
│   │   └── index.ts           # Barrel export
│   ├── Column/
│   │   ├── Column.tsx
│   │   ├── Column.module.css
│   │   ├── ColumnSkeleton.tsx # Loading state
│   │   └── index.ts
│   ├── Task/
│   │   ├── TaskCard.tsx
│   │   ├── TaskCard.module.css
│   │   ├── TaskModal.tsx
│   │   ├── TaskModal.module.css
│   │   ├── TaskSkeleton.tsx
│   │   └── index.ts
│   └── Filters/
│       ├── FilterBar.tsx
│       ├── FilterBar.module.css
│       ├── SearchBox.tsx
│       └── index.ts
├── hooks/
│   ├── useTasks.ts            # Convex query wrapper
│   ├── useTaskMutations.ts    # Mutations with optimistic updates
│   └── useKeyboardShortcuts.ts
├── lib/
│   ├── utils.ts               # escapeHtml, formatDate, etc.
│   └── constants.ts           # Status/priority mappings
├── styles/
│   └── globals.css            # CSS variables, reset
├── App.tsx
├── main.tsx
└── vite-env.d.ts
convex/                        # Already exists from Phase 1
├── schema.ts
├── tasks.ts
├── activityHistory.ts
└── _generated/
```

### Pattern 1: Convex useQuery with Loading States
**What:** Render skeleton while data loads, then actual content
**When to use:** Every component that fetches Convex data

```typescript
// Source: https://docs.convex.dev/client/react
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function TaskList({ status }: { status: Status }) {
  const tasks = useQuery(api.tasks.listTasksByStatus, { status });

  // undefined = loading, array = loaded
  if (tasks === undefined) {
    return <ColumnSkeleton />;
  }

  return (
    <div className={styles.taskList}>
      {tasks.map(task => <TaskCard key={task._id} task={task} />)}
    </div>
  );
}
```

### Pattern 2: Optimistic Updates for Drag Operations
**What:** Instant visual feedback on drag-drop, server confirms later
**When to use:** Moving tasks between columns (CONTEXT.md: "optimistic updates for moves only")

```typescript
// Source: https://docs.convex.dev/client/react/optimistic-updates
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function useTaskMutations() {
  const updateTask = useMutation(api.tasks.updateTask).withOptimisticUpdate(
    (localStore, args) => {
      const allTasks = localStore.getQuery(api.tasks.listTasks, {});
      if (allTasks === undefined) return;

      // Find and update the task locally
      const updatedTasks = allTasks.map(task =>
        task._id === args.id
          ? { ...task, ...args.updates }
          : task
      );
      localStore.setQuery(api.tasks.listTasks, {}, updatedTasks);
    }
  );

  return { updateTask };
}
```

### Pattern 3: dnd-kit Multi-Container Sortable
**What:** Multiple SortableContext providers within single DndContext
**When to use:** Kanban board with 4 columns

```typescript
// Source: https://docs.dndkit.com/presets/sortable
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

function Board() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}   // Cross-container movement
      onDragEnd={handleDragEnd}
    >
      {columns.map(column => (
        <Column key={column.status} status={column.status}>
          <SortableContext
            items={column.taskIds}
            strategy={verticalListSortingStrategy}
          >
            {column.tasks.map(task => (
              <SortableTaskCard key={task._id} task={task} />
            ))}
          </SortableContext>
        </Column>
      ))}

      <DragOverlay>
        {activeId ? <TaskCard task={findTask(activeId)} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### Pattern 4: CSS Modules with clsx
**What:** Scoped styles with conditional class composition
**When to use:** All component styling per CONTEXT.md

```typescript
// Source: https://github.com/lukeed/clsx
import clsx from "clsx";
import styles from "./TaskCard.module.css";

function TaskCard({ task, isDragging }: TaskCardProps) {
  const className = clsx(
    styles.card,
    styles[`priority${task.priority}`],  // priorityLow, priorityHigh, etc.
    {
      [styles.dragging]: isDragging,
      [styles.overdue]: isOverdue(task.dueDate),
    }
  );

  return <div className={className}>...</div>;
}
```

### Anti-Patterns to Avoid
- **Calling useSortable in DragOverlay:** Creates ID collision. Create a non-sortable presentational component for overlay.
- **Mutating objects in optimistic updates:** Always create new arrays/objects. `localStore.setQuery` requires immutable updates.
- **Conditional useQuery calls:** React hooks must be called unconditionally. Use `"skip"` argument to disable queries.
- **Using api.* for internal Convex functions:** Use `internal.*` for functions only called within Convex.
- **Filtering without indexes:** Use `.withIndex()` for performance; `.filter()` scans all documents.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | HTML5 DnD API wrapper | @dnd-kit | Touch support, accessibility, animations |
| Toast notifications | Custom portal + state | Sonner | Queue management, animations, dismiss timers |
| Conditional classes | String concatenation | clsx | Handles arrays, objects, falsy values correctly |
| Keyboard shortcuts | document.addEventListener | react-hotkeys-hook | Cleanup on unmount, scope management |
| Skeleton loaders | CSS shimmer from scratch | CSS keyframes pattern | Predictable, consistent animation |
| Form state in modal | Custom reducer | useState per field | Simple forms don't need complex state |

**Key insight:** These utilities are battle-tested for edge cases (memory leaks, focus management, touch events) that take weeks to discover and fix in custom implementations.

## Common Pitfalls

### Pitfall 1: dnd-kit Re-renders All Items
**What goes wrong:** Every sortable item re-renders on drag, causing lag with >30 items
**Why it happens:** useSortable updates transform on every move, React re-renders parent
**How to avoid:**
1. Memoize TaskCard with React.memo
2. Keep task data outside sortable transform logic
3. Use DragOverlay for smooth dragging (hides original)
**Warning signs:** Visible jank when starting drag, high CPU in devtools

### Pitfall 2: Optimistic Update Shape Mismatch
**What goes wrong:** Optimistic data doesn't match server response, UI flickers
**Why it happens:** Client-generated IDs/timestamps differ from server's
**How to avoid:** For task moves, only update `status` and `order` fields; let server handle timestamps
**Warning signs:** Task briefly shows wrong data then corrects itself

### Pitfall 3: Stale Closure in Event Handlers
**What goes wrong:** Drag handlers use stale task list, causing wrong drops
**Why it happens:** useCallback with missing dependencies
**How to avoid:** Include all data dependencies in useCallback deps array, or use refs
**Warning signs:** Tasks drop to wrong positions, especially after rapid operations

### Pitfall 4: Query Without Authentication Guard
**What goes wrong:** App crashes on load with auth errors (Phase 3 relevant)
**Why it happens:** Query runs before auth state is determined
**How to avoid:** Wrap authenticated queries in `<Authenticated>` component
**Warning signs:** "Unauthenticated" errors in console on page load

### Pitfall 5: CSS Module Class Name Typos
**What goes wrong:** Styles don't apply, no error shown
**Why it happens:** TypeScript doesn't type-check CSS module imports by default
**How to avoid:** Use IDE CSS module plugins, or typed-css-modules
**Warning signs:** Elements missing expected styles, no build errors

### Pitfall 6: Missing Keys in Lists
**What goes wrong:** Drag operations behave unexpectedly, items duplicate
**Why it happens:** Using array index as key instead of stable ID
**How to avoid:** Always use `task._id` from Convex as React key
**Warning signs:** Console warnings, items in wrong order after operations

## Code Examples

Verified patterns from official sources:

### Convex Provider Setup
```typescript
// src/main.tsx
// Source: https://docs.convex.dev/client/react
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Toaster } from "sonner";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
      <Toaster richColors position="bottom-right" />
    </ConvexProvider>
  </StrictMode>
);
```

### Task Card with Sortable
```typescript
// src/components/Task/TaskCard.tsx
// Source: https://docs.dndkit.com/presets/sortable
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Doc<"tasks">;
}

export function TaskCard({ task }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(styles.card, {
        [styles.dragging]: isDragging,
        [styles[`priority${capitalize(task.priority)}`]]: true,
      })}
      {...attributes}
      {...listeners}
    >
      <div className={styles.title}>{task.title}</div>
      {task.description && (
        <div className={styles.description}>{task.description}</div>
      )}
      <div className={styles.tags}>
        {task.tags.map(tag => (
          <span key={tag} className={clsx(styles.tag, styles[`tag${capitalize(tag)}`])}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export const MemoizedTaskCard = React.memo(TaskCard);
```

### Keyboard Shortcuts Hook
```typescript
// src/hooks/useKeyboardShortcuts.ts
// Source: https://react-hotkeys-hook.vercel.app/
import { useHotkeys } from "react-hotkeys-hook";

export function useKeyboardShortcuts({
  onEscape,
  onSave,
}: {
  onEscape: () => void;
  onSave: () => void;
}) {
  useHotkeys("escape", onEscape, { enableOnFormTags: true });
  useHotkeys("mod+enter", onSave, { enableOnFormTags: true });
}
```

### CSS Module Example
```css
/* src/components/Task/TaskCard.module.css */
.card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px;
  cursor: grab;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

/* Priority indicators */
.priorityUrgent::before { background: var(--accent-red); }
.priorityHigh::before { background: var(--accent-yellow); }
.priorityMedium::before { background: var(--accent-blue); }
.priorityLow::before { background: var(--text-muted); }
```

### Vite Configuration
```typescript
// vite.config.ts
// Source: https://vite.dev/config/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/tests/setup.ts",
  },
});
```

### TypeScript Path Aliases
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"]
    }
  },
  "include": ["src", "convex/_generated"]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2023 | rbd deprecated, dnd-kit maintained |
| classnames | clsx | 2020 | clsx is faster, smaller |
| react-toastify | sonner | 2023 | sonner is smaller, modern API |
| Create React App | Vite | 2022 | CRA deprecated, Vite is standard |
| Jest | Vitest | 2023 | Vitest faster, Vite-native |
| ESLint legacy config | ESLint flat config | 2024 | eslint.config.js replaces .eslintrc |

**Deprecated/outdated:**
- **react-beautiful-dnd**: Atlassian announced deprecation; use dnd-kit or pragmatic-drag-and-drop
- **Create React App**: Officially deprecated by React team; use Vite or Next.js
- **react-scripts**: Part of CRA, no longer recommended
- **ESLint .eslintrc format**: Flat config (eslint.config.js) is the new standard in ESLint 9+

## Open Questions

Things that couldn't be fully resolved:

1. **dnd-kit Performance Threshold**
   - What we know: Documented issues with >50 items, re-renders on every interaction
   - What's unclear: Exact threshold where UX degrades for this specific use case
   - Recommendation: Implement with memoization, monitor performance, consider virtualization if needed

2. **Exact Convex-generated Type Imports**
   - What we know: Types come from `convex/_generated/dataModel`
   - What's unclear: Whether to use `Doc<"tasks">` or custom interfaces
   - Recommendation: Use `Doc<"tasks">` for consistency with Convex patterns

3. **CSS Variables Migration**
   - What we know: Vanilla app has CSS variables in `:root`
   - What's unclear: Best way to migrate to CSS modules while keeping variables
   - Recommendation: Keep variables in globals.css, import in each module that needs them

## Sources

### Primary (HIGH confidence)
- Convex React docs: https://docs.convex.dev/client/react - useQuery, useMutation patterns
- Convex optimistic updates: https://docs.convex.dev/client/react/optimistic-updates - withOptimisticUpdate API
- dnd-kit docs: https://docs.dndkit.com - Core concepts, sortable preset
- dnd-kit sortable: https://docs.dndkit.com/presets/sortable - Multi-container setup
- Vitest guide: https://vitest.dev/guide/ - Configuration and patterns

### Secondary (MEDIUM confidence)
- [Vite path aliases setup](https://medium.com/@vitor.vicen.te/setting-up-path-aliases-in-a-vite-typescript-react-project-the-ultimate-way-d2a9a8ff7c63) - vite-tsconfig-paths recommendation
- [dnd-kit kanban tutorial](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/) - Multi-container patterns
- [React toast comparison](https://blog.logrocket.com/react-toast-libraries-compared-2025/) - Sonner vs react-hot-toast
- [Knock notification libraries](https://knock.app/blog/the-top-notification-libraries-for-react) - 2026 toast recommendations

### Tertiary (LOW confidence)
- GitHub issues on dnd-kit performance - Community reports, may not apply to our scale
- ESLint flat config examples - Multiple tutorials, verify against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries verified via official docs and npm
- Architecture: HIGH - Patterns from Convex and dnd-kit official documentation
- Pitfalls: MEDIUM - Mix of official docs and community reports

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable ecosystem)
