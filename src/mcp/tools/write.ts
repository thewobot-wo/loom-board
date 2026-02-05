/**
 * Write MCP tool registrations.
 *
 * Registers 7 tools: create_task, update_task, move_task, delete_task, archive_task, set_active_task, clear_active_task
 * All tools call the Convex HTTP API endpoints via POST and return formatted text.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callMcpApi } from "../convex-client.js";

// --- Types for API responses ---

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  tags: string[];
  dueDate: string | null;
  dueDateTimestamp: number | null;
  order: number;
  archived: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TaskResponse {
  task: TaskData;
}

interface SuccessResponse {
  success: boolean;
}

// --- Formatting helpers ---

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

function formatPriority(priority: string): string {
  return priority.toUpperCase();
}

function formatTaskConfirmation(action: string, task: TaskData): string {
  const lines: string[] = [
    `${action}`,
    "",
    `Title: ${task.title}`,
    `ID: ${task.id}`,
    `Status: ${STATUS_LABELS[task.status] ?? task.status}`,
    `Priority: ${formatPriority(task.priority)}`,
  ];

  if (task.description) {
    lines.push(`Description: ${task.description}`);
  }
  if (task.tags.length > 0) {
    lines.push(`Tags: ${task.tags.join(", ")}`);
  }
  if (task.dueDate) {
    lines.push(`Due Date: ${task.dueDate}`);
  }

  return lines.join("\n");
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true as const };
}

// --- Tool registration ---

export function registerWriteTools(server: McpServer): void {
  // Tool 1: create_task
  server.tool(
    "create_task",
    "Create a new task on the board",
    {
      title: z.string().describe("Task title (required)"),
      description: z.string().optional().describe("Task description"),
      status: z
        .enum(["backlog", "in_progress", "blocked", "done"])
        .optional()
        .describe("Column (defaults to backlog)"),
      priority: z
        .enum(["low", "medium", "high", "urgent"])
        .optional()
        .describe("Priority (defaults to medium)"),
      tags: z.array(z.string()).optional().describe("Tags"),
      dueDate: z
        .string()
        .optional()
        .describe("Due date as ISO string (e.g., 2026-02-15)"),
    },
    async ({ title, description, status, priority, tags, dueDate }) => {
      try {
        const body: Record<string, unknown> = {
          title,
          status: status ?? "backlog",
          priority: priority ?? "medium",
          tags: tags ?? [],
        };

        if (description !== undefined) {
          body.description = description;
        }

        if (dueDate !== undefined) {
          body.dueDate = new Date(dueDate).getTime();
        }

        const data = (await callMcpApi("/mcp/tasks/create", {
          method: "POST",
          body,
        })) as TaskResponse;

        return textResult(formatTaskConfirmation("Task created successfully.", data.task));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    }
  );

  // Tool 2: update_task
  server.tool(
    "update_task",
    "Update fields of an existing task",
    {
      id: z.string().describe("Task ID to update"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      priority: z
        .enum(["low", "medium", "high", "urgent"])
        .optional()
        .describe("New priority"),
      tags: z.array(z.string()).optional().describe("New tags (replaces existing)"),
      dueDate: z
        .string()
        .optional()
        .describe("New due date as ISO string, or empty string to clear"),
    },
    async ({ id, title, description, priority, tags, dueDate }) => {
      try {
        const updates: Record<string, unknown> = {};

        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (priority !== undefined) updates.priority = priority;
        if (tags !== undefined) updates.tags = tags;

        if (dueDate !== undefined) {
          if (dueDate === "") {
            // Empty string means clear the due date
            updates.dueDate = undefined;
          } else {
            updates.dueDate = new Date(dueDate).getTime();
          }
        }

        const data = (await callMcpApi("/mcp/tasks/update", {
          method: "POST",
          body: { id, updates },
        })) as TaskResponse;

        return textResult(formatTaskConfirmation("Task updated successfully.", data.task));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    }
  );

  // Tool 3: move_task
  server.tool(
    "move_task",
    "Move a task to a different column (status)",
    {
      id: z.string().describe("Task ID to move"),
      status: z
        .enum(["backlog", "in_progress", "blocked", "done"])
        .describe("Target column"),
    },
    async ({ id, status }) => {
      try {
        const data = (await callMcpApi("/mcp/tasks/move", {
          method: "POST",
          body: { id, status },
        })) as TaskResponse;

        const statusLabel = STATUS_LABELS[status] ?? status;
        return textResult(
          `Moved '${data.task.title}' to ${statusLabel}.` +
            `\n\nID: ${data.task.id}` +
            `\nPriority: ${formatPriority(data.task.priority)}`
        );
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    }
  );

  // Tool 4: delete_task
  server.tool(
    "delete_task",
    "Permanently delete a task (cannot be undone)",
    {
      id: z.string().describe("Task ID to permanently delete"),
    },
    async ({ id }) => {
      try {
        await callMcpApi("/mcp/tasks/delete", {
          method: "POST",
          body: { id },
        }) as SuccessResponse;

        return textResult("Task permanently deleted.");
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    }
  );

  // Tool 5: archive_task
  server.tool(
    "archive_task",
    "Archive a task (soft delete, can be restored)",
    {
      id: z.string().describe("Task ID to archive"),
    },
    async ({ id }) => {
      try {
        await callMcpApi("/mcp/tasks/archive", {
          method: "POST",
          body: { id },
        }) as SuccessResponse;

        return textResult("Task archived successfully.");
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    }
  );

  // Tool 6: set_active_task
  server.tool(
    "set_active_task",
    "Set a task as the currently active task being worked on",
    {
      id: z.string().describe("Task ID to set as active"),
    },
    async ({ id }) => {
      try {
        const data = (await callMcpApi("/mcp/tasks/active", {
          method: "POST",
          body: { id },
        })) as TaskResponse;

        return textResult(
          `🔥 Now actively working on: ${data.task.title}\n\n` +
          `ID: ${data.task.id}\n` +
          `Status: ${STATUS_LABELS[data.task.status] ?? data.task.status}\n` +
          `Priority: ${formatPriority(data.task.priority)}`
        );
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    }
  );

  // Tool 7: clear_active_task
  server.tool(
    "clear_active_task",
    "Clear the currently active task (stop working on everything)",
    {},
    async () => {
      try {
        await callMcpApi("/mcp/tasks/active/clear", {
          method: "POST",
          body: {},
        }) as SuccessResponse;

        return textResult("Active task cleared. Time for a break? ☕️");
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    }
  );
}
