import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Doc } from "../../../convex/_generated/dataModel";
import { STATUS_CONFIG, type Status } from "@/lib/constants";
import { SortableTaskCard } from "@/components/Task";
import styles from "./Column.module.css";

interface ColumnProps {
  status: Status;
  tasks: Doc<"tasks">[];
  onAddTask?: (status: Status) => void;
  onEditTask?: (taskId: string) => void;
}

export function Column({ status, tasks, onAddTask, onEditTask }: ColumnProps) {
  const config = STATUS_CONFIG[status];
  const showAddButton = status !== "done";

  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map((t) => t._id);

  // Calculate priority breakdown
  const urgentCount = tasks.filter((t) => t.priority === "urgent").length;
  const highCount = tasks.filter((t) => t.priority === "high").length;
  const mediumCount = tasks.filter((t) => t.priority === "medium").length;
  const lowCount = tasks.filter((t) => t.priority === "low").length;

  // Calculate progress (for in_progress column, show % of total tasks)
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.min((totalTasks / 10) * 100, 100) : 0;

  return (
    <div className={styles.column}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span
            className={styles.icon}
            data-status={status}
            style={{ background: config.color, color: config.color }}
          />
          <span className={styles.title}>{config.label}</span>
          <span className={styles.count}>
            {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
          </span>
        </div>

        {/* Progress bar - shows column "fullness" */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            data-status={status}
            style={{
              width: `${progressPercent}%`,
              background: config.color,
            }}
          />
        </div>

        {/* Priority breakdown dots */}
        {totalTasks > 0 && (
          <div className={styles.priorityBreakdown}>
            {urgentCount > 0 && (
              <div
                className={`${styles.priorityDot} ${styles.priorityUrgent}`}
                title={`${urgentCount} urgent`}
              />
            )}
            {highCount > 0 && (
              <div
                className={`${styles.priorityDot} ${styles.priorityHigh}`}
                title={`${highCount} high`}
              />
            )}
            {mediumCount > 0 && (
              <div
                className={`${styles.priorityDot} ${styles.priorityMedium}`}
                title={`${mediumCount} medium`}
              />
            )}
            {lowCount > 0 && (
              <div
                className={`${styles.priorityDot} ${styles.priorityLow}`}
                title={`${lowCount} low`}
              />
            )}
          </div>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`${styles.taskList} ${isOver ? styles.dragOver : ""}`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task._id} task={task} onEdit={onEditTask} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateCard}>
              <div className={styles.emptyStateIcon} style={{ color: config.color }}>
                {status === "done" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
                {status === "backlog" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                )}
                {status === "blocked" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                )}
                {status === "in_progress" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
              </div>
              <p className={styles.emptyStateText}>
                {status === "done"
                  ? "No completed tasks yet"
                  : status === "backlog"
                  ? "Ready to plan something new?"
                  : status === "blocked"
                  ? "Nothing blocked — smooth sailing!"
                  : "Drag tasks here to start"}
              </p>
              <div className={styles.emptyStateHint}>
                {status === "done"
                  ? "Finished tasks will appear here"
                  : status === "backlog"
                  ? "Click + Add Task to begin"
                  : status === "blocked"
                  ? "All clear for now"
                  : "Or click + Add Task"}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddButton && (
        <button
          className={styles.addButton}
          onClick={() => onAddTask?.(status)}
        >
          + Add Task
        </button>
      )}
    </div>
  );
}
