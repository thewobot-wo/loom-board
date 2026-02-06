import { memo } from "react";
import { useTimeTracking } from "@/hooks";
import { formatDurationMs, formatRelativeTime } from "@/lib/utils";
import styles from "./TimeDisplay.module.css";

interface TimeDisplayProps {
  timeSpentMs?: number;
  lastResumedAt?: number;
  startedAt?: number;
  completedAt?: number;
  status: string;
  compact?: boolean;
}

/** Clock icon (SF-style) */
function ClockIcon({ running }: { running: boolean }) {
  return (
    <svg
      className={running ? styles.iconRunning : styles.icon}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6.25" />
      <polyline points="8 4.5 8 8 10.5 9.5" />
    </svg>
  );
}

function TimeDisplayComponent({
  timeSpentMs,
  lastResumedAt,
  startedAt,
  completedAt,
  status,
  compact = true,
}: TimeDisplayProps) {
  const elapsed = useTimeTracking(timeSpentMs, lastResumedAt);
  const isRunning = !!lastResumedAt;
  const hasTime = elapsed > 0;

  // Nothing to show
  if (!hasTime && !startedAt && !completedAt) return null;

  if (compact) {
    // Compact mode: just clock + duration on the card
    if (!hasTime) return null;

    return (
      <span className={`${styles.compact} ${isRunning ? styles.running : ""}`}>
        <ClockIcon running={isRunning} />
        <span className={styles.duration}>{formatDurationMs(elapsed)}</span>
      </span>
    );
  }

  // Extended mode for modal/detail view
  return (
    <div className={styles.extended}>
      {hasTime && (
        <div className={`${styles.row} ${isRunning ? styles.running : ""}`}>
          <ClockIcon running={isRunning} />
          <span className={styles.label}>Time:</span>
          <span className={styles.value}>{formatDurationMs(elapsed)}</span>
          {isRunning && <span className={styles.liveIndicator} />}
        </div>
      )}
      {startedAt && (
        <div className={styles.row}>
          <span className={styles.label}>Started:</span>
          <span className={styles.value}>{formatRelativeTime(startedAt)}</span>
        </div>
      )}
      {completedAt && status === "done" && (
        <div className={styles.row}>
          <span className={styles.label}>Completed:</span>
          <span className={styles.value}>{formatRelativeTime(completedAt)}</span>
        </div>
      )}
    </div>
  );
}

export const TimeDisplay = memo(TimeDisplayComponent);
