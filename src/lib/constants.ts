export const STATUS_CONFIG = {
  backlog: {
    label: "Backlog",
    color: "var(--seurat-shadow)",
    dbValue: "backlog" as const,
  },
  in_progress: {
    label: "In Progress",
    color: "var(--seurat-water)",
    dbValue: "in_progress" as const,
  },
  blocked: {
    label: "Blocked",
    color: "var(--seurat-red)",
    dbValue: "blocked" as const,
  },
  done: {
    label: "Done",
    color: "var(--seurat-grass)",
    dbValue: "done" as const,
  },
} as const;

export type Status = keyof typeof STATUS_CONFIG;

export const PRIORITY_CONFIG = {
  urgent: {
    label: "P0",
    color: "var(--seurat-red)",
    dbValue: "urgent" as const,
  },
  high: {
    label: "P1",
    color: "var(--seurat-orange)",
    dbValue: "high" as const,
  },
  medium: {
    label: "P2",
    color: "var(--seurat-water)",
    dbValue: "medium" as const,
  },
  low: {
    label: "P3",
    color: "var(--seurat-shadow)",
    dbValue: "low" as const,
  },
} as const;

export type Priority = keyof typeof PRIORITY_CONFIG;

/* Tag colors from Seurat's palette */
export const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  project: { bg: "var(--seurat-water-muted)", text: "var(--seurat-water)" },
  design: { bg: "var(--seurat-grass-muted)", text: "var(--seurat-grass)" },
  research: { bg: "var(--seurat-shadow-muted)", text: "var(--seurat-shadow)" },
  bug: { bg: "var(--seurat-red-muted)", text: "var(--seurat-red)" },
  feature: { bg: "var(--seurat-orange-muted)", text: "var(--seurat-orange)" },
  maintenance: { bg: "var(--seurat-grass-muted)", text: "var(--seurat-grass-light)" },
  cruise: { bg: "var(--seurat-shadow-muted)", text: "var(--seurat-shadow)" },
  loom: { bg: "var(--seurat-orange-muted)", text: "var(--seurat-orange)" },
  ui: { bg: "var(--seurat-water-muted)", text: "var(--seurat-water)" },
  celebration: { bg: "var(--seurat-grass-muted)", text: "var(--seurat-grass)" },
  "mcp-victory": { bg: "var(--seurat-water-muted)", text: "var(--seurat-water)" },
};

export const COLUMN_ORDER: Status[] = ["backlog", "in_progress", "blocked", "done"];
