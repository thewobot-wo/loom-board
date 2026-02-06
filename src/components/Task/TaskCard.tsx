import { memo, useState, useCallback } from "react";
import clsx from "clsx";
import type { Doc } from "../../../convex/_generated/dataModel";
import { TAG_COLORS, STATUS_CONFIG, type Status } from "@/lib/constants";
import { formatDate, isOverdue, isDueSoon } from "@/lib/utils";
import { 
  useCardSwipe, 
  useLongPress, 
  useRipple, 
  useIsMobile, 
  getAdjacentStatus,
  triggerTaskHaptic,
  triggerPriorityHaptic,
  triggerStatusChangeHaptic,
} from "@/hooks";
import { TaskContextMenu } from "./TaskContextMenu";
import { TimeDisplay } from "./TimeDisplay";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Doc<"tasks">;
  isDragging?: boolean;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onSetActive?: (taskId: string) => void;
  onMoveTask?: (taskId: string, newStatus: Status) => void;
  onRefresh?: () => Promise<void>;
}

function TaskCardComponent({ 
  task, 
  isDragging, 
  onEdit, 
  onDelete, 
  onSetActive,
  onMoveTask,
}: TaskCardProps) {
  const isActive = task.isActive;
  const isMobile = useIsMobile();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  
  const priorityClasses = {
    urgent: styles.priorityUrgent,
    high: styles.priorityHigh,
    medium: styles.priorityMedium,
    low: styles.priorityLow,
  };
  const priorityClass = priorityClasses[task.priority];
  const defaultColors = { bg: "rgba(59, 130, 246, 0.15)", text: "var(--accent-blue)" };

  // Handle card movement via swipe with haptics
  const handleMoveLeft = useCallback(() => {
    const prevStatus = getAdjacentStatus(task.status as Status, "prev");
    if (prevStatus) {
      onMoveTask?.(task._id, prevStatus);
      triggerStatusChangeHaptic(prevStatus);
    } else {
      // Can't move further - warning haptic
      triggerTaskHaptic("longPressStart");
    }
  }, [task._id, task.status, onMoveTask]);

  const handleMoveRight = useCallback(() => {
    const nextStatus = getAdjacentStatus(task.status as Status, "next");
    if (nextStatus) {
      onMoveTask?.(task._id, nextStatus);
      triggerStatusChangeHaptic(nextStatus);
      // If moved to done, trigger celebration
      if (nextStatus === "done") {
        triggerTaskHaptic("taskCompleted");
      }
    } else {
      // Can't move further - warning haptic
      triggerTaskHaptic("longPressStart");
    }
  }, [task._id, task.status, onMoveTask]);

  const { 
    swipeState, 
    handleTouchStart: cardSwipeHandleTouchStart, 
    handleTouchMove: cardSwipeHandleTouchMove, 
    handleTouchEnd: cardSwipeHandleTouchEnd 
  } = useCardSwipe(
    handleMoveLeft,
    handleMoveRight,
    isMobile,
    task.status as Status
  );

  // Long press for context menu (mobile only)
  const handleLongPress = useCallback(() => {
    if (isMobile && !swipeState.isSwiping) {
      setIsPressing(false);
      setShowContextMenu(true);
    }
  }, [isMobile, swipeState.isSwiping]);

  const handleClick = useCallback(() => {
    // Only trigger click if not dragging and not showing context menu
    if (!showContextMenu && !swipeState.isSwiping) {
      onEdit?.(task._id);
    }
  }, [task._id, onEdit, showContextMenu, swipeState.isSwiping]);

  // Start pressing visual feedback
  const handlePressStart = useCallback(() => {
    if (isMobile && !swipeState.isSwiping) {
      setIsPressing(true);
    }
  }, [isMobile, swipeState.isSwiping]);

  // End pressing visual feedback
  const handlePressEnd = useCallback(() => {
    setIsPressing(false);
  }, []);

  const longPressProps = useLongPress(
    handleLongPress, 
    handleClick, 
    500, // 500ms for long press
    handlePressStart,
    handlePressEnd
  );

  // Ripple effect
  const { ripples, triggerRipple } = useRipple();

  // Merge touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    triggerRipple(e);
    longPressProps.onTouchStart(e);
    cardSwipeHandleTouchStart(e);
  }, [triggerRipple, longPressProps, cardSwipeHandleTouchStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    longPressProps.onTouchMove(e);
    cardSwipeHandleTouchMove(e);
  }, [longPressProps, cardSwipeHandleTouchMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setIsPressing(false);
    longPressProps.onTouchEnd(e);
    cardSwipeHandleTouchEnd(e);
  }, [longPressProps, cardSwipeHandleTouchEnd]);

  // Calculate swipe visual feedback
  const getSwipeStyles = () => {
    if (!isMobile || !swipeState.isSwiping) return {};
    
    const opacity = Math.max(0.6, 1 - Math.abs(swipeState.deltaX) / 200);
    const scale = Math.max(0.95, 1 - Math.abs(swipeState.deltaX) / 1000);
    const rotate = swipeState.deltaX * 0.02;
    
    return {
      transform: `translateX(${swipeState.deltaX}px) scale(${scale}) rotate(${rotate}deg)`,
      opacity,
      transition: 'none',
    };
  };

  // Pressing visual feedback
  const getPressStyles = () => {
    if (!isMobile || !isPressing || swipeState.isSwiping) return {};
    
    return {
      transform: 'scale(0.98)',
      transition: 'transform 0.15s ease',
    };
  };

  // Determine swipe action indicators
  const showLeftAction = swipeState.isSwiping && swipeState.deltaX > 50;
  const showRightAction = swipeState.isSwiping && swipeState.deltaX < -50;

  // Context menu handlers
  const handleContextMenuEdit = useCallback(() => {
    onEdit?.(task._id);
  }, [task._id, onEdit]);

  const handleContextMenuDelete = useCallback(() => {
    onDelete?.(task._id);
  }, [task._id, onDelete]);

  const handleContextMenuSetActive = useCallback(() => {
    onSetActive?.(task._id);
  }, [task._id, onSetActive]);

  const handleContextMenuMove = useCallback((newStatus: Status) => {
    onMoveTask?.(task._id, newStatus);
  }, [task._id, onMoveTask]);

  return (
    <>
      <div
        className={clsx(
          styles.card,
          isDragging && styles.dragging,
          isActive && styles.active,
          isMobile && styles.mobile,
          swipeState.isSwiping && styles.swiping,
          isPressing && styles.pressing
        )}
        data-task-id={task._id}
        style={{
          ...getSwipeStyles(),
          ...getPressStyles(),
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe action overlays */}
        {isMobile && (
          <>
            <div 
              className={clsx(
                styles.swipeAction,
                styles.swipeActionLeft,
                showLeftAction && styles.swipeActionVisible
              )}
            >
              <span>← {getAdjacentStatus(task.status as Status, "prev") && 
                STATUS_CONFIG[getAdjacentStatus(task.status as Status, "prev")!]?.label
              }</span>
            </div>
            <div 
              className={clsx(
                styles.swipeAction,
                styles.swipeActionRight,
                showRightAction && styles.swipeActionVisible
              )}
            >
              <span>{getAdjacentStatus(task.status as Status, "next") && 
                STATUS_CONFIG[getAdjacentStatus(task.status as Status, "next")!]?.label
              } →</span>
            </div>
          </>
        )}

        {/* Ripple effects */}
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className={styles.ripple}
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
          />
        ))}

        {/* Soft gradient priority indicator */}
        <div className={clsx(styles.priorityIndicator, priorityClass)} />
        
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.titleRow}>
              {isActive && <span className={styles.activeIndicator} />}
              <div className={styles.title}>{task.title}</div>
            </div>
            <button
              className={clsx(styles.menu, isMobile && styles.menuVisible)}
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(task._id);
              }}
              aria-label="Edit task"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
          </div>
          
          {task.description && (
            <div className={styles.description}>{task.description}</div>
          )}
          
          <div className={styles.footer}>
            <div className={styles.tags}>
              {task.tags.map((tag) => {
                const colors = TAG_COLORS[tag] ?? defaultColors;
                return (
                  <span
                    key={tag}
                    className={styles.tag}
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>

            <TimeDisplay
              timeSpentMs={task.timeSpentMs}
              lastResumedAt={task.lastResumedAt}
              startedAt={task.startedAt}
              completedAt={task.completedAt}
              status={task.status}
              compact
            />
            
            {task.dueDate && (
              <span
                className={clsx(
                  styles.dueDate,
                  isOverdue(task.dueDate) && task.status !== "done" && styles.overdue,
                  isDueSoon(task.dueDate) && styles.dueSoon
                )}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {formatDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu - Mobile Only */}
      {isMobile && (
        <TaskContextMenu
          task={task}
          isOpen={showContextMenu}
          onClose={() => setShowContextMenu(false)}
          onEdit={handleContextMenuEdit}
          onDelete={handleContextMenuDelete}
          onSetActive={handleContextMenuSetActive}
          onMoveTask={handleContextMenuMove}
        />
      )}
    </>
  );
}

export const TaskCard = memo(TaskCardComponent);
