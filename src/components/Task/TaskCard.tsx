import { memo } from "react";
import clsx from "clsx";
import type { Doc } from "../../../convex/_generated/dataModel";
import { TAG_COLORS } from "@/lib/constants";
import { formatDate, isOverdue, isDueSoon } from "@/lib/utils";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Doc<"tasks">;
  isDragging?: boolean;
  onEdit?: (taskId: string) => void;
}

function TaskCardComponent({ task, isDragging, onEdit }: TaskCardProps) {
  const priorityClasses = {
    urgent: styles.priorityUrgent,
    high: styles.priorityHigh,
    medium: styles.priorityMedium,
    low: styles.priorityLow,
  };
  const priorityClass = priorityClasses[task.priority];
  const defaultColors = { bg: "rgba(31, 111, 235, 0.15)", text: "var(--accent-blue)" };

  return (
    <div
      className={clsx(styles.card, isDragging && styles.dragging)}
      data-task-id={task._id}
    >
      <div className={clsx(styles.priorityIndicator, priorityClass)} />
      <div className={styles.header}>
        <div className={styles.title}>{task.title}</div>
        <button
          className={styles.menu}
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(task._id);
          }}
          aria-label="Edit task"
        >
          ...
        </button>
      </div>
      {task.description && (
        <div className={styles.description}>{task.description}</div>
      )}
      <div className={styles.meta}>
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
        {task.dueDate && (
          <span
            className={clsx(
              styles.dueDate,
              isOverdue(task.dueDate) && task.status !== "done" && styles.overdue,
              isDueSoon(task.dueDate) && styles.dueSoon
            )}
          >
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}

export const TaskCard = memo(TaskCardComponent);
