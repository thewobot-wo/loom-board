import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Doc } from "../../../convex/_generated/dataModel";
import { TaskCard } from "./TaskCard";
import styles from "./TaskCard.module.css";

interface SortableTaskCardProps {
  task: Doc<"tasks">;
  onEdit?: (taskId: string) => void;
}

export function SortableTaskCard({ task, onEdit }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? styles.dragging : undefined}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} isDragging={isDragging} onEdit={onEdit} />
    </div>
  );
}
