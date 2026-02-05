import { useState, useCallback, useEffect, useRef } from "react";
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
import { useTaskMutations, useIsMobile, useMobileNavigation } from "@/hooks";
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
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mobile navigation
  const {
    currentColumn,
    currentColumnIndex,
    goToColumn,
    setCurrentColumnIndex,
  } = useMobileNavigation();

  // Track scroll position to update active column
  useEffect(() => {
    if (!isMobile || !containerRef.current) return;

    const container = containerRef.current;
    
    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const columnWidth = container.clientWidth;
      const newIndex = Math.round(scrollLeft / columnWidth);
      
      if (newIndex >= 0 && newIndex < COLUMN_ORDER.length && newIndex !== currentColumnIndex) {
        setCurrentColumnIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMobile, currentColumnIndex, setCurrentColumnIndex]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: isMobile ? 20 : 8, // Higher threshold on mobile to prevent accidental drags
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
      }
    },
    [tasks, updateTask]
  );

  // Handle task movement from card swipe
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
      <div className={styles.container} ref={containerRef}>
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

        {/* Mobile Single Column View */}
        {isMobile && (
          <>
            <div 
              className={clsx(
                styles.mobileBoard
              )}
            >
              {COLUMN_ORDER.map((status) => (
                <div 
                  key={status} 
                  className={clsx(
                    styles.mobileColumn,
                    currentColumn === status && styles.activeColumn
                  )}
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
                    isActive={currentColumn === status}
                  />
                </div>
              ))}
            </div>

            {/* Mobile Navigation Dots */}
            <div className={styles.mobileNav}>
              <div className={styles.mobileNavDots}>
                {COLUMN_ORDER.map((status, index) => (
                  <button
                    key={status}
                    className={clsx(
                      styles.mobileNavDot,
                      index === currentColumnIndex && styles.mobileNavDotActive
                    )}
                    onClick={() => goToColumn(index)}
                    aria-label={`Go to ${status}`}
                    aria-current={index === currentColumnIndex ? "true" : undefined}
                  >
                    <span 
                      className={styles.mobileNavDotIndicator}
                      style={{
                        background: index === currentColumnIndex 
                          ? STATUS_CONFIG[status].color 
                          : undefined
                      }}
                    />
                  </button>
                ))}
              </div>
              
              <div className={styles.mobileNavLabels}>
                <span 
                  className={styles.mobileNavLabel}
                  style={{ color: STATUS_CONFIG[currentColumn].color }}
                >
                  {STATUS_CONFIG[currentColumn].label}
                </span>
                <span className={styles.mobileNavCount}>
                  {tasksByStatus[currentColumn]?.length ?? 0} tasks
                </span>
              </div>
            </div>

            {/* Swipe Hint */}
            <div className={styles.swipeHint}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Swipe to navigate</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </>
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