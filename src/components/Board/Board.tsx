import { useState, useCallback } from "react";
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
  triggerNavigationHaptic,
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
  
  // Mobile tab bar state
  const [activeTab, setActiveTab] = useState<Status>("backlog");

  // Switch tab with haptic feedback
  const handleTabChange = useCallback((status: Status) => {
    if (status !== activeTab) {
      triggerNavigationHaptic("tapNavDot");
      setActiveTab(status);
    }
  }, [activeTab]);

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
        triggerStatusChangeHaptic(targetStatus);
        if (targetStatus === "done") {
          triggerTaskHaptic("taskCompleted");
        }
      }
    },
    [tasks, updateTask]
  );

  // Handle task movement from modal (mobile)
  const handleMoveTask = useCallback(async (taskId: string, newStatus: Status) => {
    const task = tasks?.find((t) => t._id === taskId);
    if (task && task.status !== newStatus) {
      await updateTask({
        id: taskId as Id<"tasks">,
        updates: { status: newStatus },
      });
      // If moved to the active tab's column, stay there, otherwise switch tabs
      if (newStatus !== activeTab && isMobile) {
        setActiveTab(newStatus);
      }
    }
  }, [tasks, updateTask, activeTab, isMobile]);

  // Handle task deletion
  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask({ id: taskId as Id<"tasks"> });
      triggerTaskHaptic("taskDeleted");
    }
  }, [deleteTask]);

  // Handle setting active task
  const handleSetActiveTask = useCallback(async (taskId: string) => {
    const task = tasks?.find((t) => t._id === taskId);
    if (!task) return;
    
    if (task.isActive) {
      await clearActiveTask();
    } else {
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

  // Group tasks by status
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

        {/* Mobile Tab Bar View */}
        {isMobile && (
          <>
            {/* Column title */}
            <div className={styles.mobileColumnTitle}>
              <span 
                className={styles.mobileColumnTitleDot}
                style={{ backgroundColor: STATUS_CONFIG[activeTab].color }}
              />
              <span className={styles.mobileColumnTitleText}>
                {STATUS_CONFIG[activeTab].label}
              </span>
              <span className={styles.mobileColumnTitleCount}>
                {tasksByStatus[activeTab]?.length ?? 0} {(tasksByStatus[activeTab]?.length ?? 0) === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            {/* Active Column */}
            <div className={styles.mobileColumnView}>
              <Column
                status={activeTab}
                tasks={tasksByStatus[activeTab]}
                onAddTask={onAddTask}
                onEditTask={onEditTask}
                onDeleteTask={handleDeleteTask}
                onSetActiveTask={handleSetActiveTask}
                onMoveTask={handleMoveTask}
                onRefresh={onRefresh}
                isCollapsible
              />
            </div>

            {/* Bottom Tab Bar */}
            <nav className={styles.mobileTabBar} aria-label="Column navigation">
              {COLUMN_ORDER.map((status) => {
                const config = STATUS_CONFIG[status];
                const count = tasksByStatus[status]?.length ?? 0;
                const isActive = activeTab === status;
                
                return (
                  <button
                    key={status}
                    className={clsx(
                      styles.mobileTab,
                      isActive && styles.mobileTabActive
                    )}
                    onClick={() => handleTabChange(status)}
                    aria-label={`${config.label} (${count} tasks)`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {/* Status dot */}
                    <span 
                      className={styles.mobileTabDot}
                      style={{ backgroundColor: config.color }}
                    />
                    
                    {/* Label */}
                    <span className={styles.mobileTabLabel}>
                      {config.label}
                    </span>
                    
                    {/* Count badge */}
                    {count > 0 && (
                      <span className={styles.mobileTabCount}>
                        {count}
                      </span>
                    )}
                    
                    {/* Active indicator line */}
                    {isActive && (
                      <span 
                        className={styles.mobileTabIndicator}
                        style={{ backgroundColor: config.color }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
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
