import { memo, useState, useCallback } from "react";
import clsx from "clsx";
import type { Doc } from "../../../convex/_generated/dataModel";
import { TAG_COLORS, STATUS_CONFIG, type Status } from "@/lib/constants";
import { formatDate, isOverdue, isDueSoon } from "@/lib/utils";
import { useCardSwipe, useLongPress, useRipple, useIsMobile, getAdjacentStatus } from "@/hooks";
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
  const [showPeek, setShowPeek] = useState(false);
  
  const priorityClasses = {
    urgent: styles.priorityUrgent,
    high: styles.priorityHigh,
    medium: styles.priorityMedium,
    low: styles.priorityLow,
  };
  const priorityClass = priorityClasses[task.priority];
  const defaultColors = { bg: "rgba(59, 130, 246, 0.15)", text: "var(--accent-blue)" };

  // Handle card movement via swipe
  const handleMoveLeft = useCallback(() => {
    const prevStatus = getAdjacentStatus(task.status as Status, "prev");
    if (prevStatus) {
      onMoveTask?.(task._id, prevStatus);
    }
  }, [task._id, task.status, onMoveTask]);

  const handleMoveRight = useCallback(() => {
    const nextStatus = getAdjacentStatus(task.status as Status, "next");
    if (nextStatus) {
      onMoveTask?.(task._id, nextStatus);
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
    isMobile
  );

  // Long press for context menu
  const handleLongPress = useCallback(() => {
    setShowContextMenu(true);
    setShowPeek(true);
  }, []);

  const handleClick = useCallback(() => {
    onEdit?.(task._id);
  }, [task._id, onEdit]);

  const longPressProps = useLongPress(handleLongPress, handleClick, 400);

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

  // Determine swipe action indicators
  const showLeftAction = swipeState.isSwiping && swipeState.deltaX > 50;
  const showRightAction = swipeState.isSwiping && swipeState.deltaX < -50;

  return (
    <>
      <div
        className={clsx(
          styles.card,
          isDragging && styles.dragging,
          isActive && styles.active,
          isMobile && styles.mobile,
          swipeState.isSwiping && styles.swiping
        )}
        data-task-id={task._id}
        style={getSwipeStyles()}
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

      {/* Context Menu Modal */}
      {showContextMenu && (
        <div 
          className={styles.contextMenuOverlay}
          onClick={() => setShowContextMenu(false)}
        >
          <div className={styles.contextMenu} onClick={e => e.stopPropagation()}>
            <div className={styles.contextMenuHeader}>
              <span className={styles.contextMenuTitle}>{task.title}</span>
              <button 
                className={styles.contextMenuClose}
                onClick={() => setShowContextMenu(false)}
              >
                ×
              </button>
            </div>
            
            <button 
              className={styles.contextMenuItem}
              onClick={() => {
                onEdit?.(task._id);
                setShowContextMenu(false);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>

            <button 
              className={styles.contextMenuItem}
              onClick={() => {
                onSetActive?.(task._id);
                setShowContextMenu(false);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              {isActive ? "Deactivate" : "Set Active"}
            </button>

            {getAdjacentStatus(task.status as Status, "prev") && (
              <button 
                className={styles.contextMenuItem}
                onClick={() => {
                  handleMoveLeft();
                  setShowContextMenu(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Move to {STATUS_CONFIG[getAdjacentStatus(task.status as Status, "prev")!]?.label}
              </button>
            )}

            {getAdjacentStatus(task.status as Status, "next") && (
              <button 
                className={styles.contextMenuItem}
                onClick={() => {
                  handleMoveRight();
                  setShowContextMenu(false);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                Move to {STATUS_CONFIG[getAdjacentStatus(task.status as Status, "next")!]?.label}
              </button>
            )}

            <div className={styles.contextMenuDivider} />

            <button 
              className={clsx(styles.contextMenuItem, styles.contextMenuItemDanger)}
              onClick={() => {
                onDelete?.(task._id);
                setShowContextMenu(false);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Peek Preview */}
      {showPeek && (
        <div 
          className={styles.peekOverlay}
          onClick={() => setShowPeek(false)}
        >
          <div className={styles.peekCard}>
            <div className={styles.peekHeader}>
              <span className={clsx(styles.peekPriority, priorityClass)} />
              <span className={styles.peekStatus}>{STATUS_CONFIG[task.status as Status]?.label}</span>
            </div>
            <h4 className={styles.peekTitle}>{task.title}</h4>
            
            {task.description && (
              <p className={styles.peekDescription}>{task.description}</p>
            )}
            
            <div className={styles.peekFooter}>
              {task.tags.length > 0 && (
                <div className={styles.peekTags}>
                  {task.tags.map(tag => (
                    <span key={tag} className={styles.peekTag}>#{tag}</span>
                  ))}
                </div>
              )}
              
              {task.dueDate && (
                <span className={styles.peekDueDate}>
                  Due: {formatDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const TaskCard = memo(TaskCardComponent);