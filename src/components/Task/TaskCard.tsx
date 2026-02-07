import { memo, useCallback, useRef, useState } from "react";
import clsx from "clsx";
import type { Doc } from "../../../convex/_generated/dataModel";
import { TAG_COLORS } from "@/lib/constants";
import { formatDate, isOverdue, isDueSoon } from "@/lib/utils";
import { useIsMobile } from "@/hooks";
import { TimeDisplay } from "./TimeDisplay";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Doc<"tasks">;
  isDragging?: boolean;
  onEdit?: (taskId: string) => void;
  activeTaskId?: string | null;
}

function TaskCardComponent({
  task,
  isDragging,
  onEdit,
  activeTaskId,
}: TaskCardProps) {
  const isActive = task.isActive || task._id === activeTaskId;
  const isMobile = useIsMobile();

  // Scroll-click protection: track touch position to distinguish scrolls from taps
  const touchStartY = useRef<number>(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const priorityClasses = {
    urgent: styles.priorityUrgent,
    high: styles.priorityHigh,
    medium: styles.priorityMedium,
    low: styles.priorityLow,
  };
  const priorityClass = priorityClasses[task.priority];
  const defaultColors = { bg: "rgba(59, 130, 246, 0.15)", text: "var(--accent-blue)" };

  // Touch handlers for scroll-click protection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartY.current = touch.clientY;
      setIsScrolling(false);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      const deltaY = Math.abs(touch.clientY - touchStartY.current);
      if (deltaY > 10) {
        setIsScrolling(true);
      }
    }
  }, []);

  // Simple click handler - opens edit modal (suppressed if scrolling on mobile)
  const handleClick = useCallback(() => {
    if (isMobile && isScrolling) {
      return; // Suppress click if user was scrolling
    }
    onEdit?.(task._id);
  }, [task._id, onEdit, isMobile, isScrolling]);

  return (
    <div
      className={clsx(
        styles.card,
        isDragging && styles.dragging,
        isActive && styles.active
      )}
      data-task-id={task._id}
      onClick={handleClick}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
    >
      {/* Soft gradient priority indicator */}
      <div className={clsx(styles.priorityIndicator, priorityClass)} />

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            {isActive && <span className={styles.activeIndicator} />}
            <div className={styles.title}>{task.title}</div>
          </div>
          <button
            className={styles.menu}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(task._id);
            }}
            aria-label="Edit task"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>

        {task.description && (
          <div className={styles.description}>{task.description}</div>
        )}

        <div className={styles.footer}>
          <div className={styles.tags}>
            {task.tags.map((tag) => {
              const colors = TAG_COLORS[tag] ?? defaultColors;
              return (
                <span
                  key={tag}
                  className={styles.tag}
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {tag}
                </span>
              );
            })}
          </div>

          <TimeDisplay
            timeSpentMs={task.timeSpentMs}
            lastResumedAt={task.lastResumedAt}
            startedAt={task.startedAt}
            completedAt={task.completedAt}
            status={task.status}
            compact
          />

          {task.dueDate && (
            <span
              className={clsx(
                styles.dueDate,
                isOverdue(task.dueDate) && task.status !== "done" && styles.overdue,
                isDueSoon(task.dueDate) && styles.dueSoon
              )}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const TaskCard = memo(TaskCardComponent);
