import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Batch-insert migrated tasks from localStorage into Convex.
 * Tasks must be pre-validated and pre-transformed on the client side
 * (status mapped, priority mapped, tags wrapped in array, dueDate as number).
 *
 * Creates an activity history entry for each migrated task.
 */
export const migrateLocalTasks = mutation({
  args: {
    tasks: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        status: v.string(), // Already mapped to Convex format by client
        priority: v.string(), // Already mapped to Convex format by client
        tags: v.array(v.string()),
        dueDate: v.optional(v.number()),
        order: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const results = [];
    for (const task of args.tasks) {
      // Insert task with authenticated user as owner
      const taskId = await ctx.db.insert("tasks", {
        title: task.title,
        description: task.description,
        status: task.status as any, // Values guaranteed correct from client STATUS_MAP
        priority: task.priority as any, // Values guaranteed correct from client PRIORITY_MAP
        tags: task.tags,
        dueDate: task.dueDate,
        order: task.order,
        archived: false,
        updatedAt: task.updatedAt,
        userId,
        isActive: false,
      });

      // Create migration activity history entry
      await ctx.db.insert("activity_history", {
        taskId,
        field: "_migrated",
        oldValue: undefined,
        newValue: JSON.stringify({
          source: "localStorage",
          title: task.title,
        }),
        userId: userId.toString(),
      });

      results.push(taskId);
    }

    return { imported: results.length };
  },
});
