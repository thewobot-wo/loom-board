import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { statusValidator, priorityValidator } from "./schema";

// CREATE: Returns full task object with all fields (auth required, auto-assigns userId)
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Strict validation: title cannot be empty
    if (args.title.trim() === "") {
      throw new Error("Title cannot be empty");
    }

    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      ...args,
      title: args.title.trim(),
      archived: false,
      updatedAt: now,
      userId, // Auto-assign to authenticated user
      isActive: false, // Default to not active
    });

    // Log creation in activity history
    await ctx.db.insert("activity_history", {
      taskId,
      field: "_created",
      oldValue: undefined,
      newValue: JSON.stringify({ title: args.title, status: args.status }),
      userId: userId.toString(), // Real user ID
    });

    // Return full task object
    return await ctx.db.get(taskId);
  },
});

// READ: Get single task by ID (auth required, ownership validated)
export const getTask = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    if (task.userId !== userId) throw new Error("Not authorized");
    return task;
  },
});

// READ: List all non-archived tasks for authenticated user
export const listTasks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
  },
});

// READ: List tasks by status for authenticated user
export const listTasksByStatus = query({
  args: { status: statusValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Query by user first (indexed), then filter by status and archived
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), args.status),
          q.eq(q.field("archived"), false)
        )
      )
      .collect();
  },
});

// UPDATE: Partial updates with activity tracking (auth required, ownership validated)
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Task not found");
    if (existing.userId !== userId) throw new Error("Not authorized");
    if (existing.archived) throw new Error("Cannot update archived task");

    // Validate title if provided
    if (args.updates.title !== undefined && args.updates.title.trim() === "") {
      throw new Error("Title cannot be empty");
    }

    // Track ALL field changes in activity history (per CONTEXT.md)
    const updateKeys = Object.keys(args.updates) as Array<keyof typeof args.updates>;
    for (const field of updateKeys) {
      const newValue = args.updates[field];
      if (newValue === undefined) continue;

      const oldValue = existing[field as keyof typeof existing];

      // Only log if value actually changed
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        await ctx.db.insert("activity_history", {
          taskId: args.id,
          field,
          oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : undefined,
          newValue: JSON.stringify(newValue),
          userId: userId.toString(), // Real user ID
        });
      }
    }

    // Apply partial update
    const cleanUpdates: Record<string, any> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(args.updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = key === "title" ? (value as string).trim() : value;
      }
    }

    await ctx.db.patch(args.id, cleanUpdates);
    return await ctx.db.get(args.id);
  },
});

// DELETE (soft): Archive task (auth required, ownership validated)
export const archiveTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    if (task.userId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(args.id, {
      archived: true,
      updatedAt: Date.now(),
    });

    // Log archive action
    await ctx.db.insert("activity_history", {
      taskId: args.id,
      field: "archived",
      oldValue: JSON.stringify(false),
      newValue: JSON.stringify(true),
      userId: userId.toString(), // Real user ID
    });

    return { success: true };
  },
});

// RESTORE: Unarchive task back to backlog (auth required, ownership validated)
export const restoreTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    if (task.userId !== userId) throw new Error("Not authorized");
    if (!task.archived) throw new Error("Task is not archived");

    await ctx.db.patch(args.id, {
      archived: false,
      status: "backlog", // Restored tasks go to backlog
      updatedAt: Date.now(),
    });

    // Log restore action
    await ctx.db.insert("activity_history", {
      taskId: args.id,
      field: "archived",
      oldValue: JSON.stringify(true),
      newValue: JSON.stringify(false),
      userId: userId.toString(), // Real user ID
    });

    return await ctx.db.get(args.id);
  },
});

// READ: List all archived tasks for authenticated user
export const listArchivedTasks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("archived"), true))
      .collect();
  },
});

// READ: Get the currently active task for authenticated user
export const getActiveTask = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activeTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.and(
        q.eq(q.field("isActive"), true),
        q.eq(q.field("archived"), false)
      ))
      .collect();

    return activeTasks[0] ?? null;
  },
});

// MUTATION: Set a task as active (and deactivate all others)
export const setActiveTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    if (task.userId !== userId) throw new Error("Not authorized");
    if (task.archived) throw new Error("Cannot activate archived task");

    // Find and deactivate any currently active tasks
    const currentlyActive = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.and(
        q.eq(q.field("isActive"), true),
        q.eq(q.field("archived"), false)
      ))
      .collect();

    for (const activeTask of currentlyActive) {
      if (activeTask._id !== args.id) {
        await ctx.db.patch(activeTask._id, {
          isActive: false,
          updatedAt: Date.now(),
        });

        // Log deactivation
        await ctx.db.insert("activity_history", {
          taskId: activeTask._id,
          field: "isActive",
          oldValue: JSON.stringify(true),
          newValue: JSON.stringify(false),
          userId: userId.toString(),
        });
      }
    }

    // Activate the new task
    await ctx.db.patch(args.id, {
      isActive: true,
      updatedAt: Date.now(),
    });

    // Log activation
    await ctx.db.insert("activity_history", {
      taskId: args.id,
      field: "isActive",
      oldValue: JSON.stringify(task.isActive),
      newValue: JSON.stringify(true),
      userId: userId.toString(),
    });

    return await ctx.db.get(args.id);
  },
});

// MUTATION: Deactivate the currently active task
export const clearActiveTask = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentlyActive = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
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

      // Log deactivation
      await ctx.db.insert("activity_history", {
        taskId: task._id,
        field: "isActive",
        oldValue: JSON.stringify(true),
        newValue: JSON.stringify(false),
        userId: userId.toString(),
      });
    }

    return { success: true };
  },
});
