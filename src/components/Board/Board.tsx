import { useState, useCallback, useRef, useEffect } from "react";
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
  onRefresh?: () => Promise<void>;
  activeTaskId?: string | null;
  totalTasksByStatus?: Record<Status, number>;
  hasActiveFilters?: boolean;
}

export function Board({
  tasks,
  onAddTask,
  onEditTask,
  onRefresh,
  activeTaskId,
  totalTasksByStatus,
  hasActiveFilters = false,
}: BoardProps) {
  const { updateTask } = useTaskMutations();
  const [draggingTask, setDraggingTask] = useState<Doc<"tasks"> | null>(null);
  const isMobile = useIsMobile();

  // Mobile tab bar state
  const [activeTab, setActiveTab] = useState<Status>("backlog");

  // Scroll position preservation per column
  const scrollPositions = useRef<Record<Status, number>>({
    backlog: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
  });

  // Ref for the column content panel (for focus management)
  const columnPanelRef = useRef<HTMLDivElement>(null);

  // Save scroll position when it changes
  const handleScroll = useCallback(() => {
    if (columnPanelRef.current) {
      scrollPositions.current[activeTab] = columnPanelRef.current.scrollTop;
    }
  }, [activeTab]);

  // Restore scroll position when tab changes
  useEffect(() => {
    if (isMobile && columnPanelRef.current) {
      columnPanelRef.current.scrollTop = scrollPositions.current[activeTab];
    }
  }, [activeTab, isMobile]);

  // Switch tab with haptic feedback and focus management
  const handleTabChange = useCallback((status: Status) => {
    if (status !== activeTab) {
      // Save current scroll position before switching
      if (columnPanelRef.current) {
        scrollPositions.current[activeTab] = columnPanelRef.current.scrollTop;
      }
      triggerNavigationHaptic("tapNavDot");
      setActiveTab(status);
      // Move focus to column content for accessibility
      setTimeout(() => {
        columnPanelRef.current?.focus();
      }, 0);
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

  // Loading state - single skeleton on mobile, 4 on desktop
  if (tasks === undefined) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          {isMobile ? (
            <ColumnSkeleton />
          ) : (
            COLUMN_ORDER.map((status) => (
              <ColumnSkeleton key={status} />
            ))
          )}
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
                onRefresh={onRefresh}
                activeTaskId={activeTaskId}
                totalTasks={totalTasksByStatus?.[status]}
                hasActiveFilters={hasActiveFilters}
              />
            ))}
          </div>
        )}

        {/* Mobile Tab Bar View */}
        {isMobile && (
          <>
            {/* Column title - sticky */}
            <div className={styles.mobileColumnTitle}>
              <span
                className={styles.mobileColumnTitleDot}
                style={{ backgroundColor: STATUS_CONFIG[activeTab].color }}
              />
              <span className={styles.mobileColumnTitleText}>
                {STATUS_CONFIG[activeTab].label}
              </span>
              <span
                className={styles.mobileColumnTitleCount}
                aria-live="polite"
                aria-atomic="true"
              >
                {tasksByStatus[activeTab]?.length ?? 0} {(tasksByStatus[activeTab]?.length ?? 0) === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            {/* Active Column - tabpanel */}
            <div
              ref={columnPanelRef}
              className={styles.mobileColumnView}
              role="tabpanel"
              id={`column-panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              tabIndex={-1}
              onScroll={handleScroll}
            >
              <Column
                status={activeTab}
                tasks={tasksByStatus[activeTab]}
                onAddTask={onAddTask}
                onEditTask={onEditTask}
                onRefresh={onRefresh}
                isCollapsible
                activeTaskId={activeTaskId}
                totalTasks={totalTasksByStatus?.[activeTab]}
                hasActiveFilters={hasActiveFilters}
              />
            </div>

            {/* Bottom Tab Bar */}
            <nav
              className={styles.mobileTabBar}
              role="tablist"
              aria-label="Column navigation"
            >
              {COLUMN_ORDER.map((status) => {
                const config = STATUS_CONFIG[status];
                const count = tasksByStatus[status]?.length ?? 0;
                const isActive = activeTab === status;

                return (
                  <button
                    key={status}
                    id={`tab-${status}`}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`column-panel-${status}`}
                    className={clsx(
                      styles.mobileTab,
                      isActive && styles.mobileTabActive
                    )}
                    onClick={() => handleTabChange(status)}
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

                    {/* Count badge - using flexbox positioning */}
                    {count > 0 && (
                      <span
                        className={styles.mobileTabCount}
                        aria-live="polite"
                        aria-atomic="true"
                      >
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
