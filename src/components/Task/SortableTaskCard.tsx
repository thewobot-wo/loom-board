import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useIsMobile } from "@/hooks";
import { TaskCard } from "./TaskCard";
import styles from "./TaskCard.module.css";

interface SortableTaskCardProps {
  task: Doc<"tasks">;
  onEdit?: (taskId: string) => void;
  activeTaskId?: string | null;
}

export function SortableTaskCard({
  task,
  onEdit,
  activeTaskId,
}: SortableTaskCardProps) {
  const isMobile = useIsMobile();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    // Disable drag on mobile to allow tap interactions
    disabled: isMobile,
  });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
    // Disable pointer events on the wrapper when dragging
    pointerEvents: isDragging ? "none" as const : "auto" as const,
  }), [transform, transition, isDragging]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? styles.dragging : undefined}
      // Only spread drag attributes/listeners on desktop
      {...(!isMobile ? attributes : {})}
      {...(!isMobile ? listeners : {})}
    >
      <TaskCard
        task={task}
        isDragging={isDragging}
        onEdit={onEdit}
        activeTaskId={activeTaskId}
      />
    </div>
  );
}
