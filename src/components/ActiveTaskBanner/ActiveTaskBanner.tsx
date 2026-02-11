import type { Doc } from "../../../convex/_generated/dataModel";
import { STATUS_CONFIG, type Status } from "@/lib/constants";
import { TimeDisplay } from "@/components/Task";
import styles from "./ActiveTaskBanner.module.css";

interface ActiveTaskBannerProps {
  task: Doc<"tasks">;
  onClear: () => void;
}

export function ActiveTaskBanner({ task, onClear }: ActiveTaskBannerProps) {
  const status = task.status as Status;
  const config = STATUS_CONFIG[status];

  return (
    <div className={styles.banner}>
      <div className={styles.focusBadge}>
        <span className={styles.pulse} />
        <span className={styles.focusLabel}>Focus</span>
      </div>

      <span className={styles.title}>{task.title}</span>

      <div className={styles.meta}>
        <span
          className={styles.statusPill}
          style={{
            background: `color-mix(in srgb, ${config.color} 12%, transparent)`,
            color: config.color,
          }}
        >
          <span
            className={styles.statusDot}
            style={{ background: config.color }}
          />
          {config.label}
        </span>

        <TimeDisplay
          timeSpentMs={task.timeSpentMs}
          lastResumedAt={task.lastResumedAt}
          startedAt={task.startedAt}
          completedAt={task.completedAt}
          status={task.status}
          compact
        />

        <button
          className={styles.clearButton}
          onClick={onClear}
          title="Clear active task"
          aria-label="Clear active task"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
