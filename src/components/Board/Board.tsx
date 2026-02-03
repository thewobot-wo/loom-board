import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { COLUMN_ORDER, type Status } from "@/lib/constants";
import { useTaskMutations } from "@/hooks";
import { Column, ColumnSkeleton } from "@/components/Column";
import { TaskCard } from "@/components/Task";
import styles from "./Board.module.css";

interface BoardProps {
  tasks: Doc<"tasks">[] | undefined;
  onAddTask?: (status: Status) => void;
  onEditTask?: (taskId: string) => void;
}

export function Board({ tasks, onAddTask, onEditTask }: BoardProps) {
  const { updateTask } = useTaskMutations();
  const [activeTask, setActiveTask] = useState<Doc<"tasks"> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = tasks?.find((t) => t._id === active.id);
    if (task) {
      setActiveTask(task);
    }
  }, [tasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const taskId = active.id as Id<"tasks">;
      const task = tasks?.find((t) => t._id === taskId);
      if (!task) return;

      let targetStatus: Status;

      if (COLUMN_ORDER.includes(over.id as Status)) {
        targetStatus = over.id as Status;
      } else {
        const overTask = tasks?.find((t) => t._id === over.id);
        if (!overTask) return;
        targetStatus = overTask.status as Status;
      }

      if (task.status !== targetStatus) {
        await updateTask({
          id: taskId,
          updates: { status: targetStatus },
        });
      }
    },
    [tasks, updateTask]
  );

  // Loading state
  if (tasks === undefined) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          {COLUMN_ORDER.map((status) => (
            <ColumnSkeleton key={status} />
          ))}
        </div>
      </div>
    );
  }

  // Group tasks by status and sort by order within each column
  const tasksByStatus = COLUMN_ORDER.reduce(
    (acc, status) => {
      acc[status] = tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.order - b.order);
      return acc;
    },
    {} as Record<Status, Doc<"tasks">[]>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.container}>
        <div className={styles.board}>
          {COLUMN_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              onAddTask={onAddTask}
              onEditTask={onEditTask}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className={styles.dragOverlay}>
            <TaskCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
