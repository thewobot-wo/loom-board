import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Query history for a specific task
export const getTaskHistory = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activity_history")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc") // Most recent first
      .collect();
  },
});

// Query recent activity across all tasks (for activity panel)
export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const activities = await ctx.db
      .query("activity_history")
      .order("desc")
      .take(limit);

    // Enrich with task titles
    const enriched = await Promise.all(
      activities.map(async (activity) => {
        const task = await ctx.db.get(activity.taskId);
        return {
          ...activity,
          taskTitle: task?.title ?? "[Deleted Task]",
        };
      })
    );

    return enriched;
  },
});

// Internal mutation for cleanup (called by cron, not exposed publicly)
export const cleanupOldRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 90 days in milliseconds
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

    // Query old records (batch of 1000 to avoid timeout)
    const oldRecords = await ctx.db
      .query("activity_history")
      .filter((q) => q.lt(q.field("_creationTime"), ninetyDaysAgo))
      .take(1000);

    // Delete each record
    let deletedCount = 0;
    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
      deletedCount++;
    }

    console.log(`Activity history cleanup: deleted ${deletedCount} records older than 90 days`);
    return { deletedCount };
  },
});
