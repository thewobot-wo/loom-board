export const STATUS_CONFIG = {
  backlog: {
    label: "Backlog",
    color: "var(--status-backlog)",
    dbValue: "backlog" as const,
  },
  in_progress: {
    label: "In Progress",
    color: "var(--status-progress)",
    dbValue: "in_progress" as const,
  },
  blocked: {
    label: "Blocked",
    color: "var(--status-blocked)",
    dbValue: "blocked" as const,
  },
  done: {
    label: "Done",
    color: "var(--status-done)",
    dbValue: "done" as const,
  },
} as const;

export type Status = keyof typeof STATUS_CONFIG;

export const PRIORITY_CONFIG = {
  urgent: {
    label: "P0",
    color: "var(--priority-urgent)",
    dbValue: "urgent" as const,
  },
  high: {
    label: "P1",
    color: "var(--priority-high)",
    dbValue: "high" as const,
  },
  medium: {
    label: "P2",
    color: "var(--priority-normal)",
    dbValue: "medium" as const,
  },
  low: {
    label: "P3",
    color: "var(--priority-low)",
    dbValue: "low" as const,
  },
} as const;

export type Priority = keyof typeof PRIORITY_CONFIG;

/* Tag colors - Seurat palette */
export const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  project: { bg: "var(--seurat-blue-muted)", text: "var(--seurat-blue)" },
  design: { bg: "var(--seurat-sage-muted)", text: "var(--seurat-sage)" },
  research: { bg: "var(--seurat-violet-muted)", text: "var(--seurat-violet)" },
  bug: { bg: "var(--seurat-rose-muted)", text: "var(--seurat-rose)" },
  feature: { bg: "var(--seurat-terra-muted)", text: "var(--seurat-terra)" },
  maintenance: { bg: "var(--seurat-gold-muted)", text: "var(--seurat-gold)" },
  loom: { bg: "var(--seurat-terra-muted)", text: "var(--seurat-terra)" },
  ui: { bg: "var(--seurat-blue-muted)", text: "var(--seurat-blue)" },
  celebration: { bg: "var(--seurat-sage-muted)", text: "var(--seurat-sage)" },
  "mcp-victory": { bg: "var(--seurat-blue-muted)", text: "var(--seurat-blue)" },
};

export const COLUMN_ORDER: Status[] = ["backlog", "in_progress", "blocked", "done"];
