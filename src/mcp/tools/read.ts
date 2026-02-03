/**
 * Read-only MCP tool registrations.
 *
 * Registers 4 tools: list_tasks, get_task, search_tasks, get_board_summary
 * All tools call the Convex HTTP API endpoints and return formatted text.
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
  createdAt: string;
  updatedAt: string;
}

interface ListTasksResponse {
  tasks: TaskData[];
}

interface GetTaskResponse {
  task: TaskData;
}

interface SearchTasksResponse {
  tasks: TaskData[];
  count: number;
}

interface ColumnData {
  count: number;
  tasks: { id: string; title: string; priority: string }[];
}

interface BoardSummaryResponse {
  columns: {
    backlog: ColumnData;
    in_progress: ColumnData;
    blocked: ColumnData;
    done: ColumnData;
  };
  total: number;
  overdue: {
    count: number;
    tasks: { id: string; title: string; dueDate: string }[];
  };
}

// --- Formatting helpers ---

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
};

function formatPriority(priority: string): string {
  return priority.toUpperCase();
}

function formatTaskLine(task: TaskData): string {
  const parts: string[] = [];
  parts.push(`[${formatPriority(task.priority)}] ${task.title} (ID: ${task.id})`);

  const details: string[] = [];
  details.push(`Status: ${STATUS_LABELS[task.status] ?? task.status}`);
  if (task.dueDate) {
    details.push(`Due: ${task.dueDate}`);
  }
  if (task.tags.length > 0) {
    details.push(`Tags: ${task.tags.join(", ")}`);
  }
  parts.push(`  ${details.join(" | ")}`);

  return parts.join("\n");
}

function formatTaskDetail(task: TaskData): string {
  const lines: string[] = [
    `# Task: ${task.title}`,
    `ID: ${task.id}`,
    `Status: ${STATUS_LABELS[task.status] ?? task.status}`,
    `Priority: ${formatPriority(task.priority)}`,
    `Description: ${task.description ?? "No description"}`,
    `Tags: ${task.tags.length > 0 ? task.tags.join(", ") : "None"}`,
    `Due Date: ${task.dueDate ?? "No due date"}`,
    `Created: ${task.createdAt}`,
    `Updated: ${task.updatedAt}`,
  ];
  return lines.join("\n");
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true as const };
}

// --- Tool registration ---

export function registerReadTools(server: McpServer): void {
  // Tool 1: list_tasks
  server.tool(
    "list_tasks",
    "List all active (non-archived) tasks on the board",
    {},
    async () => {
      try {
        const data = (await callMcpApi("/mcp/tasks")) as ListTasksResponse;
        const tasks = data.tasks;

        if (tasks.length === 0) {
          return textResult("No active tasks on the board.");
        }

        // Group tasks by status
        const groups: Record<string, TaskData[]> = {
          backlog: [],
          in_progress: [],
          blocked: [],
          done: [],
        };

        for (const task of tasks) {
          if (groups[task.status]) {
            groups[task.status].push(task);
          }
        }

        const sections: string[] = [];
        for (const [status, statusTasks] of Object.entries(groups)) {
          if (statusTasks.length === 0) continue;
          sections.push(`## ${STATUS_LABELS[status] ?? status}`);
          for (const task of statusTasks) {
            sections.push(formatTaskLine(task));
          }
          sections.push(""); // blank line between sections
        }

        return textResult(sections.join("\n").trimEnd());
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    }
  );

  // Tool 2: get_task
  server.tool(
    "get_task",
    "Get full details of a specific task by its ID",
    {
      id: z.string().describe("The task ID"),
    },
    async ({ id }) => {
      try {
        const data = (await callMcpApi(`/mcp/tasks/get?id=${encodeURIComponent(id)}`)) as GetTaskResponse;
        return textResult(formatTaskDetail(data.task));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    }
  );

  // Tool 3: search_tasks
  server.tool(
    "search_tasks",
    "Search tasks by text, priority, tags, or due date",
    {
      text: z.string().optional().describe("Search text (matches title and description)"),
      priority: z
        .enum(["low", "medium", "high", "urgent"])
        .optional()
        .describe("Filter by priority"),
      status: z
        .enum(["backlog", "in_progress", "blocked", "done"])
        .optional()
        .describe("Filter by status (column)"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Filter by tags (OR logic - matches any)"),
      dueDate: z
        .union([
          z
            .enum(["overdue", "due-today", "due-this-week", "no-due-date"])
            .describe("Named preset"),
          z
            .object({
              dueAfter: z.string().optional().describe("ISO date string"),
              dueBefore: z.string().optional().describe("ISO date string"),
            })
            .describe("Custom date range"),
        ])
        .optional()
        .describe("Due date filter"),
    },
    async ({ text, priority, status, tags, dueDate }) => {
      try {
        const body: Record<string, unknown> = {};
        if (text !== undefined) body.text = text;
        if (priority !== undefined) body.priority = priority;
        if (status !== undefined) body.status = status;
        if (tags !== undefined) body.tags = tags;
        if (dueDate !== undefined) body.dueDate = dueDate;

        const data = (await callMcpApi("/mcp/tasks/search", {
          method: "POST",
          body,
        })) as SearchTasksResponse;

        const tasks = data.tasks;

        if (tasks.length === 0) {
          return textResult("No tasks match the search criteria.");
        }

        const lines: string[] = [`Found ${data.count} task(s):`, ""];
        for (const task of tasks) {
          lines.push(formatTaskLine(task));
          lines.push(""); // blank line between tasks
        }

        return textResult(lines.join("\n").trimEnd());
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    }
  );

  // Tool 4: get_board_summary
  server.tool(
    "get_board_summary",
    "Get a summary of the board with task counts per column and overdue tasks",
    {},
    async () => {
      try {
        const data = (await callMcpApi("/mcp/board/summary", {
          method: "POST",
          body: {},
        })) as BoardSummaryResponse;

        const lines: string[] = [
          "# Board Summary",
          `Total tasks: ${data.total}`,
          "",
          "## Columns",
          `Backlog: ${data.columns.backlog.count} tasks`,
          `In Progress: ${data.columns.in_progress.count} tasks`,
          `Blocked: ${data.columns.blocked.count} tasks`,
          `Done: ${data.columns.done.count} tasks`,
        ];

        if (data.overdue.count > 0) {
          lines.push("");
          lines.push(`## Overdue Tasks (${data.overdue.count})`);
          for (const task of data.overdue.tasks) {
            lines.push(`- ${task.title} (due: ${task.dueDate})`);
          }
        }

        return textResult(lines.join("\n"));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    }
  );
}
