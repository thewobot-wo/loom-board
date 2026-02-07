import { memo, useCallback } from "react";
import clsx from "clsx";
import type { Doc } from "../../../convex/_generated/dataModel";
import { TAG_COLORS, STATUS_CONFIG, type Status } from "@/lib/constants";
import { formatDate, isOverdue, isDueSoon } from "@/lib/utils";
import { 
  useIsMobile, 
  getAdjacentStatus,
  triggerStatusChangeHaptic,
} from "@/hooks";
import { TimeDisplay } from "./TimeDisplay";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Doc<"tasks">;
  isDragging?: boolean;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onSetActive?: (taskId: string) => void;
  onMoveTask?: (taskId: string, newStatus: Status) => void;
  onRefresh?: () => Promise<void>;
}

function TaskCardComponent({ 
  task, 
  isDragging, 
  onEdit, 
  onDelete, 
  onSetActive,
  onMoveTask,
}: TaskCardProps) {
  const isActive = task.isActive;
  const isMobile = useIsMobile();
  
  const priorityClasses = {
    urgent: styles.priorityUrgent,
    high: styles.priorityHigh,
    medium: styles.priorityMedium,
    low: styles.priorityLow,
  };
  const priorityClass = priorityClasses[task.priority];
  const defaultColors = { bg: "rgba(59, 130, 246, 0.15)", text: "var(--accent-blue)" };

  // Handle card movement (for desktop DnD or context menu)
  const handleMoveLeft = useCallback(() => {
    const prevStatus = getAdjacentStatus(task.status as Status, "prev");
    if (prevStatus) {
      onMoveTask?.(task._id, prevStatus);
      triggerStatusChangeHaptic(prevStatus);
    }
  }, [task._id, task.status, onMoveTask]);

  const handleMoveRight = useCallback(() => {
    const nextStatus = getAdjacentStatus(task.status as Status, "next");
    if (nextStatus) {
      onMoveTask?.(task._id, nextStatus);
      triggerStatusChangeHaptic(nextStatus);
    }
  }, [task._id, task.status, onMoveTask]);

  // Simple click handler - opens edit modal
  const handleClick = useCallback(() => {
    onEdit?.(task._id);
  }, [task._id, onEdit]);

  return (
    <div
      className={clsx(
        styles.card,
        isDragging && styles.dragging,
        isActive && styles.active,
        isMobile && styles.mobile
      )}
      data-task-id={task._id}
      onClick={handleClick}
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
            className={clsx(styles.menu, isMobile && styles.menuVisible)}
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
