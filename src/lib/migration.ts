/**
 * Client-side migration utilities for reading, validating, and transforming
 * localStorage v1.0 task data into the current Convex schema format.
 *
 * This module is pure client-side code -- no Convex or server imports.
 */

// --- Types ---

/** Task shape as stored in localStorage by the v1.0 HTML app */
export interface LocalStorageTask {
  id: string;
  title: string;
  description?: string;
  status: string; // "backlog" | "in-progress" | "blocked" | "done"
  priority: string; // "p0" | "p1" | "p2" | "p3"
  tag: string; // singular string
  dueDate?: string; // "YYYY-MM-DD" date string
  createdAt?: number;
  archived?: boolean;
  blockedReason?: string | null;
  startedAt?: number;
  completedAt?: number;
  blockedSince?: number;
}

// --- Constants ---

/** The localStorage key used by the v1.0 HTML app */
export const LOOM_TASKS_KEY = "loom-tasks";

/** Flag key to prevent re-prompting after migration or skip */
export const MIGRATION_FLAG_KEY = "loom-migration-complete";

/** Maps v1.0 status values (hyphen) to Convex schema values (underscore) */
export const STATUS_MAP: Record<string, string> = {
  backlog: "backlog",
  "in-progress": "in_progress",
  blocked: "blocked",
  done: "done",
};

/** Maps v1.0 priority codes to Convex schema named priorities */
export const PRIORITY_MAP: Record<string, string> = {
  p0: "urgent",
  p1: "high",
  p2: "medium",
  p3: "low",
};

/** Valid status values in the v1.0 format */
export const VALID_OLD_STATUSES = ["backlog", "in-progress", "blocked", "done"];

// --- Functions ---

/**
 * Reads and parses the loom-tasks localStorage key.
 * Returns the tasks array or null on any failure (missing key, malformed JSON,
 * unexpected shape).
 */
export function readLocalStorageTasks(): LocalStorageTask[] | null {
  try {
    const raw = localStorage.getItem(LOOM_TASKS_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data.tasks || !Array.isArray(data.tasks)) return null;

    return data.tasks;
  } catch {
    return null;
  }
}

/**
 * Type guard that validates a task object matches the expected v1.0 format.
 * Checks required fields (id, title, status) and validates optional field types.
 */
export function isValidV1Task(task: unknown): task is LocalStorageTask {
  if (!task || typeof task !== "object") return false;
  const t = task as Record<string, unknown>;

  // Required fields
  if (typeof t.id !== "string") return false;
  if (typeof t.title !== "string" || t.title.trim() === "") return false;
  if (typeof t.status !== "string" || !VALID_OLD_STATUSES.includes(t.status))
    return false;

  // Optional fields -- check types only if present
  if (t.description !== undefined && typeof t.description !== "string")
    return false;
  if (t.priority !== undefined && typeof t.priority !== "string") return false;
  if (t.tag !== undefined && typeof t.tag !== "string") return false;
  if (t.archived !== undefined && typeof t.archived !== "boolean") return false;
  if (t.createdAt !== undefined && typeof t.createdAt !== "number")
    return false;
  if (t.dueDate !== undefined && typeof t.dueDate !== "string") return false;
  if (
    t.blockedReason !== undefined &&
    t.blockedReason !== null &&
    typeof t.blockedReason !== "string"
  )
    return false;
  if (t.startedAt !== undefined && typeof t.startedAt !== "number")
    return false;
  if (t.completedAt !== undefined && typeof t.completedAt !== "number")
    return false;
  if (t.blockedSince !== undefined && typeof t.blockedSince !== "number")
    return false;

  return true;
}

/**
 * Transforms a v1.0 localStorage task into the Convex schema format.
 * Handles all schema differences: status hyphen->underscore, priority p0->urgent,
 * tag->tags array, dueDate string->number.
 *
 * @param task - A validated v1.0 task
 * @param order - The display order index for this task
 */
export function transformTask(task: LocalStorageTask, order: number) {
  // Parse dueDate string to timestamp, skip if invalid
  let dueDate: number | undefined;
  if (task.dueDate) {
    const parsed = new Date(task.dueDate).getTime();
    if (!isNaN(parsed)) {
      dueDate = parsed;
    }
  }

  const now = Date.now();

  return {
    title: task.title,
    description: task.description || undefined,
    status: STATUS_MAP[task.status] ?? "backlog",
    priority: PRIORITY_MAP[task.priority] ?? "medium",
    tags: task.tag ? [task.tag] : [],
    dueDate,
    order,
    createdAt: task.createdAt ?? now,
    updatedAt: task.createdAt ?? now, // Preserves relative ordering per RESEARCH.md
  };
}

/**
 * Checks whether migration has already been completed or skipped.
 */
export function hasMigrated(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === "true";
}

/**
 * Marks migration as complete to prevent re-prompting.
 */
export function markMigrated(): void {
  localStorage.setItem(MIGRATION_FLAG_KEY, "true");
}

/**
 * Removes the v1.0 tasks data from localStorage after successful migration.
 */
export function clearLocalStorageTasks(): void {
  localStorage.removeItem(LOOM_TASKS_KEY);
}
