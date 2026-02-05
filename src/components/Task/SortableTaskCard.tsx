import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { Status } from "@/lib/constants";
import { TaskCard } from "./TaskCard";
import styles from "./TaskCard.module.css";

interface SortableTaskCardProps {
  task: Doc<"tasks">;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onSetActive?: (taskId: string) => void;
  onMoveTask?: (taskId: string, newStatus: Status) => void;
}

export function SortableTaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onSetActive, 
  onMoveTask 
}: SortableTaskCardProps) {
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
      <TaskCard 
        task={task} 
        isDragging={isDragging} 
        onEdit={onEdit}
        onDelete={onDelete}
        onSetActive={onSetActive}
        onMoveTask={onMoveTask}
      />
    </div>
  );
}