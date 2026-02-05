import { httpAction, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

// --- Helper Functions ---

function validateToken(request: Request): { userId: Id<"users"> } {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.slice("Bearer ".length);
  const expectedToken = process.env.MCP_API_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    throw new Error("UNAUTHORIZED");
  }

  const userId = process.env.MCP_USER_ID;
  if (!userId) {
    throw new Error("MCP_USER_ID not configured");
  }

  return { userId: userId as Id<"users"> };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

type TaskDoc = {
  _id: Id<"tasks">;
  _creationTime: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  tags: string[];
  dueDate?: number;
  order: number;
  archived: boolean;
  updatedAt: number;
  userId?: Id<"users">;
  isActive?: boolean;
};

function formatTask(task: TaskDoc) {
  return {
    id: task._id,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    tags: task.tags,
    dueDate: task.dueDate ? formatDate(task.dueDate) : null,
    dueDateTimestamp: task.dueDate ?? null,
    order: task.order,
    archived: task.archived,
    isActive: task.isActive ?? false,
    createdAt: formatDate(task._creationTime),
    updatedAt: formatDate(task.updatedAt),
  };
}

const VALID_STATUSES = ["backlog", "in_progress", "blocked", "done"] as const;
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

type Status = (typeof VALID_STATUSES)[number];
type Priority = (typeof VALID_PRIORITIES)[number];

function isValidStatus(s: string): s is Status {
  return (VALID_STATUSES as readonly string[]).includes(s);
}

function isValidPriority(p: string): p is Priority {
  return (VALID_PRIORITIES as readonly string[]).includes(p);
}

// --- Internal Query/Mutation Functions ---
// These are called by the HTTP actions below via ctx.runQuery/ctx.runMutation.
// They accept userId as a parameter instead of using getAuthUserId,
// so the MCP API can authenticate via API token instead of session auth.

export const listTasksInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
  },
});

export const getTaskInternal = internalQuery({
  args: { userId: v.id("users"), taskId: v.string() },
  handler: async (ctx, args) => {
    const taskId = args.taskId as Id<"tasks">;
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error(`Task not found with ID: ${args.taskId}`);
    if (task.userId !== args.userId) throw new Error("Not authorized to access this task");
    return task;
  },
});

export const createTaskInternal = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    priority: v.string(),
    tags: v.array(v.string()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Calculate order: max existing order + 1 for the target status column
    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), args.status),
          q.eq(q.field("archived"), false)
        )
      )
      .collect();

    const maxOrder = existingTasks.reduce(
      (max, t) => Math.max(max, t.order),
      0
    );

    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: args.status as any,
      priority: args.priority as any,
      tags: args.tags,
      dueDate: args.dueDate,
      order: maxOrder + 1,
      archived: false,
      updatedAt: now,
      userId: args.userId,
      isActive: false,
    });

    // Log creation in activity history
    await ctx.db.insert("activity_history", {
      taskId,
      field: "_created",
      oldValue: undefined,
      newValue: JSON.stringify({ title: args.title, status: args.status }),
      userId: args.userId.toString(),
    });

    const task = await ctx.db.get(taskId);
    return task!;
  },
});

export const updateTaskInternal = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.string(),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      priority: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      dueDate: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const taskId = args.taskId as Id<"tasks">;
    const existing = await ctx.db.get(taskId);
    if (!existing) throw new Error(`Task not found with ID: ${args.taskId}`);
    if (existing.userId !== args.userId) throw new Error("Not authorized to modify this task");

    // Track field changes in activity history
    const updateEntries = Object.entries(args.updates) as [string, any][];
    for (const [field, newValue] of updateEntries) {
      if (newValue === undefined) continue;
      const oldValue = existing[field as keyof typeof existing];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        await ctx.db.insert("activity_history", {
          taskId,
          field,
          oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : undefined,
          newValue: JSON.stringify(newValue),
          userId: args.userId.toString(),
        });
      }
    }

    // Build clean updates
    const cleanUpdates: Record<string, any> = { updatedAt: Date.now() };
    for (const [key, value] of updateEntries) {
      if (value !== undefined) {
        cleanUpdates[key] = key === "title" ? (value as string).trim() : value;
      }
    }

    await ctx.db.patch(taskId, cleanUpdates);
    const task = await ctx.db.get(taskId);
    return task!;
  },
});

export const deleteTaskInternal = internalMutation({
  args: { userId: v.id("users"), taskId: v.string() },
  handler: async (ctx, args) => {
    const taskId = args.taskId as Id<"tasks">;
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error(`Task not found with ID: ${args.taskId}`);
    if (task.userId !== args.userId) throw new Error("Not authorized to delete this task");

    // Permanently delete the task
    await ctx.db.delete(taskId);

    // Also clean up activity history for this task
    const history = await ctx.db
      .query("activity_history")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect();

    for (const record of history) {
      await ctx.db.delete(record._id);
    }

    return { success: true };
  },
});

export const archiveTaskInternal = internalMutation({
  args: { userId: v.id("users"), taskId: v.string() },
  handler: async (ctx, args) => {
    const taskId = args.taskId as Id<"tasks">;
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error(`Task not found with ID: ${args.taskId}`);
    if (task.userId !== args.userId) throw new Error("Not authorized to archive this task");

    await ctx.db.patch(taskId, {
      archived: true,
      updatedAt: Date.now(),
    });

    // Log archive action
    await ctx.db.insert("activity_history", {
      taskId,
      field: "archived",
      oldValue: JSON.stringify(false),
      newValue: JSON.stringify(true),
      userId: args.userId.toString(),
    });

    return { success: true };
  },
});

export const searchTasksInternal = internalQuery({
  args: {
    userId: v.id("users"),
    text: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    dueDate: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Start with all non-archived tasks for this user
    let tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();

    // Filter by text (case-insensitive match on title + description)
    if (args.text) {
      const searchText = args.text.toLowerCase();
      tasks = tasks.filter((t) => {
        const titleMatch = t.title.toLowerCase().includes(searchText);
        const descMatch = t.description
          ? t.description.toLowerCase().includes(searchText)
          : false;
        return titleMatch || descMatch;
      });
    }

    // Filter by priority (exact match)
    if (args.priority) {
      tasks = tasks.filter((t) => t.priority === args.priority);
    }

    // Filter by status (exact match)
    if (args.status) {
      tasks = tasks.filter((t) => t.status === args.status);
    }

    // Filter by tags (OR logic: task has ANY of the provided tags)
    if (args.tags && args.tags.length > 0) {
      tasks = tasks.filter((t) =>
        args.tags!.some((tag: string) => t.tags.includes(tag))
      );
    }

    // Filter by dueDate
    if (args.dueDate) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayStart = startOfToday.getTime();
      const todayEnd = todayStart + 24 * 60 * 60 * 1000;

      if (typeof args.dueDate === "string") {
        // Named presets
        switch (args.dueDate) {
          case "overdue":
            tasks = tasks.filter(
              (t) => t.dueDate !== undefined && t.dueDate < todayStart
            );
            break;
          case "due-today":
            tasks = tasks.filter(
              (t) =>
                t.dueDate !== undefined &&
                t.dueDate >= todayStart &&
                t.dueDate < todayEnd
            );
            break;
          case "due-this-week": {
            const dayOfWeek = new Date().getDay();
            const daysUntilEndOfWeek = 7 - dayOfWeek;
            const weekEnd = todayStart + daysUntilEndOfWeek * 24 * 60 * 60 * 1000;
            tasks = tasks.filter(
              (t) =>
                t.dueDate !== undefined &&
                t.dueDate >= todayStart &&
                t.dueDate < weekEnd
            );
            break;
          }
          case "no-due-date":
            tasks = tasks.filter((t) => t.dueDate === undefined);
            break;
        }
      } else if (typeof args.dueDate === "object") {
        // Custom date range: { dueAfter?, dueBefore? }
        const { dueAfter, dueBefore } = args.dueDate as {
          dueAfter?: string;
          dueBefore?: string;
        };
        if (dueAfter) {
          const afterTs = new Date(dueAfter).getTime();
          tasks = tasks.filter(
            (t) => t.dueDate !== undefined && t.dueDate >= afterTs
          );
        }
        if (dueBefore) {
          const beforeTs = new Date(dueBefore).getTime();
          tasks = tasks.filter(
            (t) => t.dueDate !== undefined && t.dueDate <= beforeTs
          );
        }
      }
    }

    return tasks;
  },
});

export const getActiveTaskInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(
        q.eq(q.field("isActive"), true),
        q.eq(q.field("archived"), false)
      ))
      .collect();

    return tasks[0] ?? null;
  },
});

export const setActiveTaskInternal = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const taskId = args.taskId as Id<"tasks">;
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error(`Task not found with ID: ${args.taskId}`);
    if (task.userId !== args.userId) throw new Error("Not authorized to modify this task");
    if (task.archived) throw new Error("Cannot activate archived task");

    // Find and deactivate any currently active tasks
    const currentlyActive = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(
        q.eq(q.field("isActive"), true),
        q.eq(q.field("archived"), false)
      ))
      .collect();

    for (const activeTask of currentlyActive) {
      if (activeTask._id !== taskId) {
        await ctx.db.patch(activeTask._id, {
          isActive: false,
          updatedAt: Date.now(),
        });
      }
    }

    // Activate the new task
    await ctx.db.patch(taskId, {
      isActive: true,
      updatedAt: Date.now(),
    });

    const updatedTask = await ctx.db.get(taskId);
    return updatedTask!;
  },
});

export const clearActiveTaskInternal = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentlyActive = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(
        q.eq(q.field("isActive"), true),
        q.eq(q.field("archived"), false)
      ))
      .collect();

    for (const task of currentlyActive) {
      await ctx.db.patch(task._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// --- HTTP Action Handlers ---

// 1. List all non-archived tasks for the MCP user
export const listTasks = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    const tasks = await ctx.runQuery(internal.mcpApi.listTasksInternal, {
      userId,
    });

    return jsonResponse({ tasks: tasks.map(formatTask) });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});

// 2. Get a single task by ID
export const getTask = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    const url = new URL(request.url);
    const taskId = url.searchParams.get("id");
    if (!taskId) {
      return errorResponse("Missing required query parameter: id", 400);
    }

    const task = await ctx.runQuery(internal.mcpApi.getTaskInternal, {
      userId,
      taskId,
    });

    if (!task) {
      return errorResponse(`Task not found with ID: ${taskId}`, 404);
    }

    return jsonResponse({ task: formatTask(task) });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    if (e.message?.includes("not found") || e.message?.includes("Not authorized")) {
      return errorResponse(e.message, 404);
    }
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});

// 3. Create a new task
export const createTask = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    const body = await request.json();
    const { title, description, status, priority, tags, dueDate } = body;

    if (!title || (typeof title === "string" && title.trim() === "")) {
      return errorResponse("Title is required and cannot be empty", 400);
    }

    const taskStatus = status ?? "backlog";
    if (!isValidStatus(taskStatus)) {
      return errorResponse(
        `Invalid status: "${taskStatus}". Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }

    const taskPriority = priority ?? "medium";
    if (!isValidPriority(taskPriority)) {
      return errorResponse(
        `Invalid priority: "${taskPriority}". Must be one of: ${VALID_PRIORITIES.join(", ")}`,
        400
      );
    }

    const taskTags = tags ?? [];
    if (!Array.isArray(taskTags)) {
      return errorResponse("Tags must be an array of strings", 400);
    }

    const task = await ctx.runMutation(internal.mcpApi.createTaskInternal, {
      userId,
      title: title.trim(),
      description: description ?? undefined,
      status: taskStatus,
      priority: taskPriority,
      tags: taskTags,
      dueDate: dueDate ? Number(dueDate) : undefined,
    });

    return jsonResponse({ task: formatTask(task) }, 201);
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});

// 4. Update an existing task
export const updateTask = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    const body = await request.json();
    const { id, updates } = body;

    if (!id) {
      return errorResponse("Missing required field: id", 400);
    }
    if (!updates || typeof updates !== "object") {
      return errorResponse("Missing required field: updates (object)", 400);
    }

    // Validate fields if provided
    if (updates.title !== undefined && (typeof updates.title !== "string" || updates.title.trim() === "")) {
      return errorResponse("Title cannot be empty", 400);
    }
    if (updates.status !== undefined && !isValidStatus(updates.status)) {
      return errorResponse(
        `Invalid status: "${updates.status}". Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }
    if (updates.priority !== undefined && !isValidPriority(updates.priority)) {
      return errorResponse(
        `Invalid priority: "${updates.priority}". Must be one of: ${VALID_PRIORITIES.join(", ")}`,
        400
      );
    }

    const task = await ctx.runMutation(internal.mcpApi.updateTaskInternal, {
      userId,
      taskId: id,
      updates,
    });

    if (!task) {
      return errorResponse(`Task not found with ID: ${id}`, 404);
    }

    return jsonResponse({ task: formatTask(task) });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    if (e.message?.includes("not found")) return errorResponse(e.message, 404);
    if (e.message?.includes("Not authorized")) return errorResponse(e.message, 403);
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});

// 5. Move task to a different status column
export const moveTask = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    const body = await request.json();
    const { id, status } = body;

    if (!id) {
      return errorResponse("Missing required field: id", 400);
    }
    if (!status || !isValidStatus(status)) {
      return errorResponse(
        `Invalid or missing status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }

    const task = await ctx.runMutation(internal.mcpApi.updateTaskInternal, {
      userId,
      taskId: id,
      updates: { status },
    });

    if (!task) {
      return errorResponse(`Task not found with ID: ${id}`, 404);
    }

    return jsonResponse({ task: formatTask(task) });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    if (e.message?.includes("not found")) return errorResponse(e.message, 404);
    if (e.message?.includes("Not authorized")) return errorResponse(e.message, 403);
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});

// 6. Permanently delete a task
export const deleteTask = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse("Missing required field: id", 400);
    }

    await ctx.runMutation(internal.mcpApi.deleteTaskInternal, {
      userId,
      taskId: id,
    });

    return jsonResponse({ success: true });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    if (e.message?.includes("not found")) return errorResponse(e.message, 404);
    if (e.message?.includes("Not authorized")) return errorResponse(e.message, 403);
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});

// 7. Archive a task (soft delete)
export const archiveTask = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse("Missing required field: id", 400);
    }

    await ctx.runMutation(internal.mcpApi.archiveTaskInternal, {
      userId,
      taskId: id,
    });

    return jsonResponse({ success: true });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    if (e.message?.includes("not found")) return errorResponse(e.message, 404);
    if (e.message?.includes("Not authorized")) return errorResponse(e.message, 403);
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});

// 8. Search tasks with filters
export const searchTasks = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    const body = await request.json();
    const { text, priority, tags, dueDate, status } = body;

    if (priority !== undefined && !isValidPriority(priority)) {
      return errorResponse(
        `Invalid priority: "${priority}". Must be one of: ${VALID_PRIORITIES.join(", ")}`,
        400
      );
    }

    if (status !== undefined && !isValidStatus(status)) {
      return errorResponse(
        `Invalid status: "${status}". Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }

    const tasks = await ctx.runQuery(internal.mcpApi.searchTasksInternal, {
      userId,
      text,
      priority,
      status,
      tags,
      dueDate,
    });

    return jsonResponse({ tasks: tasks.map(formatTask), count: tasks.length });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});

// 9. Get board summary with column counts and task details
export const getBoardSummary = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    const tasks = await ctx.runQuery(internal.mcpApi.listTasksInternal, {
      userId,
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayStart = startOfToday.getTime();

    type ColumnKey = "backlog" | "in_progress" | "blocked" | "done";
    const columns: Record<
      ColumnKey,
      { count: number; tasks: { id: string; title: string; priority: string }[] }
    > = {
      backlog: { count: 0, tasks: [] },
      in_progress: { count: 0, tasks: [] },
      blocked: { count: 0, tasks: [] },
      done: { count: 0, tasks: [] },
    };

    const overdueTasks: { id: string; title: string; dueDate: string }[] = [];

    for (const task of tasks) {
      const status = task.status as ColumnKey;
      if (columns[status]) {
        columns[status].count++;
        columns[status].tasks.push({
          id: task._id,
          title: task.title,
          priority: task.priority,
        });
      }

      // Check overdue: has dueDate, dueDate is before start of today, and not done
      if (task.dueDate && task.dueDate < todayStart && task.status !== "done") {
        overdueTasks.push({
          id: task._id,
          title: task.title,
          dueDate: formatDate(task.dueDate),
        });
      }
    }

    return jsonResponse({
      columns,
      total: tasks.length,
      overdue: {
        count: overdueTasks.length,
        tasks: overdueTasks,
      },
    });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});

// 10. Get the currently active task
export const getActiveTask = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    const task = await ctx.runQuery(internal.mcpApi.getActiveTaskInternal, {
      userId,
    });

    return jsonResponse({ task: task ? formatTask(task) : null });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});

// 11. Set a task as active
export const setActiveTask = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse("Missing required field: id", 400);
    }

    const task = await ctx.runMutation(internal.mcpApi.setActiveTaskInternal, {
      userId,
      taskId: id,
    });

    return jsonResponse({ task: formatTask(task) });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    if (e.message?.includes("not found")) return errorResponse(e.message, 404);
    if (e.message?.includes("Not authorized")) return errorResponse(e.message, 403);
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});

// 12. Clear the currently active task
export const clearActiveTask = httpAction(async (ctx, request) => {
  try {
    const { userId } = validateToken(request);

    await ctx.runMutation(internal.mcpApi.clearActiveTaskInternal, {
      userId,
    });

    return jsonResponse({ success: true });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return errorResponse("Unauthorized", 401);
    return errorResponse(e.message ?? "Internal server error", 500);
  }
});
