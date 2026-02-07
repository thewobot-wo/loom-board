import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import clsx from "clsx";
import type { Doc } from "../../../convex/_generated/dataModel";
import { STATUS_CONFIG, type Status } from "@/lib/constants";
import { SortableTaskCard } from "@/components/Task";
import { usePullToRefresh, useIsMobile } from "@/hooks";
import styles from "./Column.module.css";

interface ColumnProps {
  status: Status;
  tasks: Doc<"tasks">[];
  onAddTask?: (status: Status) => void;
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onSetActiveTask?: (taskId: string) => void;
  onMoveTask?: (taskId: string, newStatus: Status) => void;
  onRefresh?: () => Promise<void>;
  isActive?: boolean;
}

// Chromolume loading spinner component
function ChromolumeSpinner() {
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.chromolumeSpinner}>
        <div className={styles.spinnerRing} data-color="blue" />
        <div className={styles.spinnerRing} data-color="green" />
        <div className={styles.spinnerRing} data-color="purple" />
        <div className={styles.spinnerRing} data-color="orange" />
        <div className={styles.spinnerCore} />
      </div>
      <span className={styles.spinnerText}>Syncing...</span>
    </div>
  );
}

// Pull indicator component
function PullIndicator({ distance }: { distance: number }) {
  const progress = Math.min(distance / 60, 1);
  const isReady = distance >= 60;
  
  return (
    <div 
      className={clsx(
        styles.pullIndicator,
        isReady && styles.pullReady
      )}
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * -20}px)`,
      }}
    >
      <div 
        className={styles.pullArrow}
        style={{
          transform: `rotate(${progress * 180}deg)`,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <span className={styles.pullText}>
        {isReady ? "Release to refresh" : "Pull to refresh"}
      </span>
    </div>
  );
}

export function Column({ 
  status, 
  tasks, 
  onAddTask, 
  onEditTask,
  onDeleteTask,
  onSetActiveTask,
  onMoveTask,
  onRefresh,
  isActive,
}: ColumnProps) {
  const config = STATUS_CONFIG[status];
  const showAddButton = status !== "done";
  const isMobile = useIsMobile();

  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map((t) => t._id);

  // Calculate priority breakdown
  const urgentCount = tasks.filter((t) => t.priority === "urgent").length;
  const highCount = tasks.filter((t) => t.priority === "high").length;
  const mediumCount = tasks.filter((t) => t.priority === "medium").length;
  const lowCount = tasks.filter((t) => t.priority === "low").length;

  // Calculate progress
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.min((totalTasks / 10) * 100, 100) : 0;

  // Pull to refresh setup (desktop only - mobile uses tab bar)
  const { 
    containerRef, 
    pullState, 
    handleTouchStart, 
    handleTouchMove, 
    handleTouchEnd 
  } = usePullToRefresh(async () => {
    await onRefresh?.();
  }, !isMobile); // Only on desktop

  // Combine refs for droppable and pull-to-refresh
  const setCombinedRef = (element: HTMLDivElement | null) => {
    setNodeRef(element);
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = element;
  };

  return (
    <div 
      className={clsx(
        styles.column, 
        isActive && styles.columnActive,
        isMobile && styles.columnMobile
      )}
    >
      {/* Header - hidden on mobile (tab bar shows this info) */}
      <div className={clsx(styles.header, isMobile && styles.headerMobile)}>
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

        {/* Progress bar */}
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

      {/* Pull to refresh indicator - desktop only */}
      {!isMobile && pullState.isPulling && !pullState.isRefreshing && (
        <PullIndicator distance={pullState.pullDistance} />
      )}

      {/* Refreshing spinner */}
      {pullState.isRefreshing && (
        <div className={styles.refreshOverlay}>
          <ChromolumeSpinner />
        </div>
      )}

      <div
        ref={setCombinedRef}
        className={clsx(
          styles.taskList, 
          isOver && styles.dragOver,
          isMobile && styles.taskListMobile
        )}
        onTouchStart={!isMobile ? handleTouchStart : undefined}
        onTouchMove={!isMobile ? handleTouchMove : undefined}
        onTouchEnd={!isMobile ? handleTouchEnd : undefined}
        style={{
          transform: pullState.isPulling 
            ? `translateY(${pullState.pullDistance}px)` 
            : undefined,
          transition: pullState.isPulling ? 'none' : 'transform 0.3s ease',
        }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard 
              key={task._id} 
              task={task} 
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onSetActive={onSetActiveTask}
              onMoveTask={onMoveTask}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateCard}>
              <div className={styles.emptyStateIcon} style={{ color: config.color }}>
                {status === "done" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
                {status === "backlog" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                )}
                {status === "blocked" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                )}
                {status === "in_progress" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
              </div>
              <p className={styles.emptyStateText}>
                {status === "done"
                  ? "No completed tasks yet"
                  : status === "backlog"
                  ? "Ready to plan something new?"
                  : status === "blocked"
                  ? "Nothing blocked — smooth sailing!"
                  : "Drag tasks here to start"}
              </p>
              <div className={styles.emptyStateHint}>
                {status === "done"
                  ? "Finished tasks will appear here"
                  : status === "backlog"
                  ? "Click + Add Task to begin"
                  : status === "blocked"
                  ? "All clear for now"
                  : "Or click + Add Task"}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddButton && (
        <button
          className={styles.addButton}
          onClick={() => onAddTask?.(status)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Task
        </button>
      )}
    </div>
  );
}
