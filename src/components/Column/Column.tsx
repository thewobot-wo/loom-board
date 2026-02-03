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

  return (
    <div className={styles.column}>
      <div className={styles.header}>
        <span className={styles.title} style={{ color: config.color }}>
          <span className={styles.icon} style={{ background: config.color }} />
          {config.label}
        </span>
        <span className={styles.count}>{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`${styles.taskList} ${isOver ? styles.dragOver : ""}`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task._id}
              task={task}
              onEdit={onEditTask}
            />
          ))}
        </SortableContext>
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
