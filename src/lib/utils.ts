export function escapeHtml(text: string | undefined): string {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function formatDate(date: Date | number): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function isOverdue(dueDate: number | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function isDueSoon(dueDate: number | undefined): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  return due > now && due < twoDaysFromNow;
}

// --- Time tracking utilities ---

/** Format milliseconds into a compact duration string */
export function formatDurationMs(ms: number): string {
  if (ms < 60_000) return "<1m";
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/** Format a timestamp into relative time (e.g., "2h ago", "3d ago") */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/** Calculate total elapsed time for a task including running timer */
export function getTaskElapsedMs(task: {
  timeSpentMs?: number;
  lastResumedAt?: number;
}): number {
  let total = task.timeSpentMs ?? 0;
  if (task.lastResumedAt) {
    total += Date.now() - task.lastResumedAt;
  }
  return total;
}
