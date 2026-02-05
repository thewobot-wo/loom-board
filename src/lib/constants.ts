export const STATUS_CONFIG = {
  backlog: {
    label: "Backlog",
    color: "var(--text-tertiary)",
    dbValue: "backlog" as const,
  },
  in_progress: {
    label: "In Progress",
    color: "var(--chroma-blue)",
    dbValue: "in_progress" as const,
  },
  blocked: {
    label: "Blocked",
    color: "var(--chroma-red)",
    dbValue: "blocked" as const,
  },
  done: {
    label: "Done",
    color: "var(--chroma-green)",
    dbValue: "done" as const,
  },
} as const;

export type Status = keyof typeof STATUS_CONFIG;

export const PRIORITY_CONFIG = {
  urgent: {
    label: "P0",
    color: "var(--chroma-red)",
    dbValue: "urgent" as const,
  },
  high: {
    label: "P1",
    color: "var(--chroma-orange)",
    dbValue: "high" as const,
  },
  medium: {
    label: "P2",
    color: "var(--chroma-blue)",
    dbValue: "medium" as const,
  },
  low: {
    label: "P3",
    color: "var(--text-tertiary)",
    dbValue: "low" as const,
  },
} as const;

export type Priority = keyof typeof PRIORITY_CONFIG;

/* Tag colors from logo */
export const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  project: { bg: "var(--chroma-blue-muted)", text: "var(--chroma-blue)" },
  design: { bg: "var(--chroma-green-muted)", text: "var(--chroma-green)" },
  research: { bg: "var(--chroma-purple-muted)", text: "var(--chroma-purple)" },
  bug: { bg: "var(--chroma-red-muted)", text: "var(--chroma-red)" },
  feature: { bg: "var(--chroma-orange-muted)", text: "var(--chroma-orange)" },
  maintenance: { bg: "var(--chroma-yellow-muted)", text: "var(--chroma-yellow)" },
  loom: { bg: "var(--chroma-orange-muted)", text: "var(--chroma-orange)" },
  ui: { bg: "var(--chroma-blue-muted)", text: "var(--chroma-blue)" },
  celebration: { bg: "var(--chroma-green-muted)", text: "var(--chroma-green)" },
  "mcp-victory": { bg: "var(--chroma-blue-muted)", text: "var(--chroma-blue)" },
};

export const COLUMN_ORDER: Status[] = ["backlog", "in_progress", "blocked", "done"];
