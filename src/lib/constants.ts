export const STATUS_CONFIG = {
  backlog: {
    label: "Backlog",
    color: "var(--text-muted)",
    dbValue: "backlog" as const,
  },
  in_progress: {
    label: "In Progress",
    color: "var(--accent-blue)",
    dbValue: "in_progress" as const,
  },
  blocked: {
    label: "Blocked",
    color: "var(--accent-red)",
    dbValue: "blocked" as const,
  },
  done: {
    label: "Done",
    color: "var(--accent-green)",
    dbValue: "done" as const,
  },
} as const;

export type Status = keyof typeof STATUS_CONFIG;

export const PRIORITY_CONFIG = {
  urgent: {
    label: "P0 Critical",
    color: "var(--accent-red)",
    dbValue: "urgent" as const,
  },
  high: {
    label: "P1 High",
    color: "var(--accent-yellow)",
    dbValue: "high" as const,
  },
  medium: {
    label: "P2 Normal",
    color: "var(--accent-blue)",
    dbValue: "medium" as const,
  },
  low: {
    label: "P3 Low",
    color: "var(--text-muted)",
    dbValue: "low" as const,
  },
} as const;

export type Priority = keyof typeof PRIORITY_CONFIG;

export const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  project: { bg: "rgba(31, 111, 235, 0.15)", text: "var(--accent-blue)" },
  research: { bg: "rgba(137, 87, 229, 0.15)", text: "var(--accent-purple)" },
  bug: { bg: "rgba(248, 81, 73, 0.15)", text: "var(--accent-red)" },
  feature: { bg: "rgba(63, 185, 80, 0.15)", text: "var(--accent-green)" },
  maintenance: { bg: "rgba(210, 153, 34, 0.15)", text: "var(--accent-yellow)" },
  cruise: { bg: "rgba(163, 113, 247, 0.15)", text: "#bc8cff" },
};

export const COLUMN_ORDER: Status[] = ["backlog", "in_progress", "blocked", "done"];
