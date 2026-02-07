import { useState, useCallback, useMemo } from "react";
import clsx from "clsx";
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
import { COLUMN_ORDER, STATUS_CONFIG, type Status } from "@/lib/constants";
import { 
  useTaskMutations, 
  useIsMobile,
  triggerStatusChangeHaptic,
  triggerTaskHaptic,
} from "@/hooks";
import { Column, ColumnSkeleton } from "@/components/Column";
import { TaskCard } from "@/components/Task";
import styles from "./Board.module.css";

interface BoardProps {
  tasks: Doc<"tasks">[] | undefined;
  onAddTask?: (status: Status) => void;
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onSetActiveTask?: (taskId: string) => void;
  onRefresh?: () => Promise<void>;
}

export function Board({ 
  tasks, 
  onAddTask, 
  onEditTask,
  onDeleteTask,
  onSetActiveTask,
  onRefresh,
}: BoardProps) {
  const { updateTask, deleteTask, setActiveTask, clearActiveTask } = useTaskMutations();
  const [draggingTask, setDraggingTask] = useState<Doc<"tasks"> | null>(null);
  const isMobile = useIsMobile();
  
  // Mobile column collapse state - all expanded except "done" by default
  const [collapsedColumns, setCollapsedColumns] = useState<Record<Status, boolean>>({
    backlog: false,
    in_progress: false,
    blocked: false,
    done: true, // Start collapsed
  });

  // Toggle column collapse
  const toggleColumn = useCallback((status: Status) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [status]: !prev[status],
    }));
  }, []);

  // Desktop: Enable sensors. Mobile: Disable sensors (no DnD)
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

  // Mobile sensors - only keyboard, no pointer
  const mobileSensors = useSensors(
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = tasks?.find((t) => t._id === active.id);
    if (task) {
      setDraggingTask(task);
    }
  }, [tasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setDraggingTask(null);

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
        // Trigger status change haptic
        triggerStatusChangeHaptic(targetStatus);
        // If moved to done, trigger task completed celebration
        if (targetStatus === "done") {
          triggerTaskHaptic("taskCompleted");
        }
      }
    },
    [tasks, updateTask]
  );

  // Handle task movement from context menu (mobile)
  const handleMoveTask = useCallback(async (taskId: string, newStatus: Status) => {
    const task = tasks?.find((t) => t._id === taskId);
    if (task && task.status !== newStatus) {
      await updateTask({
        id: taskId as Id<"tasks">,
        updates: { status: newStatus },
      });
    }
  }, [tasks, updateTask]);

  // Handle task deletion
  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask({ id: taskId as Id<"tasks"> });
      // Trigger task deleted haptic
      triggerTaskHaptic("taskDeleted");
    }
  }, [deleteTask]);

  // Handle setting active task
  const handleSetActiveTask = useCallback(async (taskId: string) => {
    const task = tasks?.find((t) => t._id === taskId);
    if (!task) return;
    
    if (task.isActive) {
      // Deactivate this task
      await clearActiveTask();
    } else {
      // Activate this task (deactivates others automatically)
      await setActiveTask({ id: taskId as Id<"tasks"> });
    }
  }, [tasks, setActiveTask, clearActiveTask]);

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
  const tasksByStatus = useMemo(() => {
    return COLUMN_ORDER.reduce(
      (acc, status) => {
        acc[status] = tasks
          .filter((t) => t.status === status)
          .sort((a, b) => a.order - b.order);
        return acc;
      },
      {} as Record<Status, Doc<"tasks">[]>
    );
  }, [tasks]);

  return (
    <DndContext
      sensors={isMobile ? mobileSensors : sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.container}>
        {/* Desktop Grid View */}
        {!isMobile && (
          <div className={styles.board}>
            {COLUMN_ORDER.map((status) => (
              <Column
                key={status}
                status={status}
                tasks={tasksByStatus[status]}
                onAddTask={onAddTask}
                onEditTask={onEditTask}
                onDeleteTask={handleDeleteTask}
                onSetActiveTask={handleSetActiveTask}
                onMoveTask={handleMoveTask}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}

        {/* Mobile Vertical Stacked View */}
        {isMobile && (
          <div className={styles.mobileStackedBoard}>
            {COLUMN_ORDER.map((status) => (
              <div 
                key={status} 
                className={clsx(
                  styles.mobileColumnSection,
                  collapsedColumns[status] && styles.mobileColumnCollapsed
                )}
              >
                {/* Collapsible Header */}
                <button
                  className={styles.mobileColumnHeader}
                  onClick={() => toggleColumn(status)}
                  aria-expanded={!collapsedColumns[status]}
                  aria-controls={`column-content-${status}`}
                >
                  <div className={styles.mobileColumnHeaderLeft}>
                    <span 
                      className={styles.mobileColumnDot}
                      style={{ backgroundColor: STATUS_CONFIG[status].color }}
                    />
                    <span className={styles.mobileColumnTitle}>
                      {STATUS_CONFIG[status].label}
                    </span>
                    <span className={styles.mobileColumnCount}>
                      {tasksByStatus[status]?.length ?? 0}
                    </span>
                  </div>
                  <svg 
                    className={styles.mobileColumnChevron}
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Collapsible Content */}
                <div 
                  id={`column-content-${status}`}
                  className={styles.mobileColumnContent}
                >
                  <Column
                    status={status}
                    tasks={tasksByStatus[status]}
                    onAddTask={onAddTask}
                    onEditTask={onEditTask}
                    onDeleteTask={handleDeleteTask}
                    onSetActiveTask={handleSetActiveTask}
                    onMoveTask={handleMoveTask}
                    onRefresh={onRefresh}
                    isCollapsible
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DragOverlay>
        {draggingTask ? (
          <div className={styles.dragOverlay}>
            <TaskCard task={draggingTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
