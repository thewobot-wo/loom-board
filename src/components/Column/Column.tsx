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
            {status === "done"
              ? "No completed tasks yet"
              : status === "backlog"
              ? "Ready to plan something new?"
              : status === "blocked"
              ? "Nothing blocked — smooth sailing!"
              : "Drag tasks here to start"}
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
