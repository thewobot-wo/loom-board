import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Reusable validators for enums
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
  ...authTables, // Spreads users, authSessions, authAccounts, authRefreshTokens, authVerificationCodes, authVerifiers, authRateLimits

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: statusValidator,
    priority: priorityValidator,
    tags: v.array(v.string()),
    dueDate: v.optional(v.number()), // timestamp in ms
    order: v.number(), // for manual reordering within columns
    archived: v.boolean(), // soft delete flag
    updatedAt: v.number(), // manual timestamp (ms since epoch)
    userId: v.optional(v.id("users")), // owner of the task (optional for migration)
    // Note: _id and _creationTime are automatic from Convex
  })
    // Compound index for querying by status with order
    .index("by_status_order", ["status", "order"])
    // Single-field indexes for filtering
    .index("by_priority", ["priority"])
    .index("by_dueDate", ["dueDate"])
    .index("by_archived", ["archived"])
    .index("by_user", ["userId"]), // Query tasks by owner

  activity_history: defineTable({
    taskId: v.id("tasks"),
    field: v.string(), // which field changed
    oldValue: v.optional(v.string()), // JSON stringified for flexibility
    newValue: v.optional(v.string()), // JSON stringified for flexibility
    userId: v.optional(v.string()), // null until auth implemented (Phase 3)
    // Note: _creationTime tracks when change occurred (automatically indexed)
  })
    .index("by_task", ["taskId"]),
});
