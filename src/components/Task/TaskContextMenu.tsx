import { useState, useCallback, useEffect } from "react";
import clsx from "clsx";
import type { Doc } from "../../../convex/_generated/dataModel";
import { STATUS_CONFIG, COLUMN_ORDER, type Status } from "@/lib/constants";
import { triggerTaskHaptic, triggerErrorHaptic } from "@/hooks";
import styles from "./TaskContextMenu.module.css";

interface TaskContextMenuProps {
  task: Doc<"tasks">;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetActive: () => void;
  onMoveTask: (newStatus: Status) => void;
}

export function TaskContextMenu({
  task,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onSetActive,
  onMoveTask,
}: TaskContextMenuProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [showMoveOptions, setShowMoveOptions] = useState(false);
  const isActive = task.isActive;

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      setShowMoveOptions(false);
      onClose();
    }, 180);
  }, [onClose]);

  // Trigger haptic when menu opens
  useEffect(() => {
    if (isOpen) {
      // Medium pop when context menu opens
      triggerTaskHaptic("longPressStart");
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleEdit = useCallback(() => {
    handleClose();
    setTimeout(onEdit, 200);
  }, [handleClose, onEdit]);

  const handleDelete = useCallback(() => {
    // Warning buzz for delete confirmation
    triggerErrorHaptic("deleteConfirmation");
    handleClose();
    setTimeout(onDelete, 200);
  }, [handleClose, onDelete]);

  const handleSetActive = useCallback(() => {
    handleClose();
    setTimeout(onSetActive, 200);
  }, [handleClose, onSetActive]);

  const handleMove = useCallback((status: Status) => {
    // Satisfying pop when selecting move destination
    triggerTaskHaptic("taskCreated");
    handleClose();
    setTimeout(() => onMoveTask(status), 200);
  }, [handleClose, onMoveTask]);

  const handleShowMoveOptions = useCallback(() => {
    // Light tick when opening move options
    triggerTaskHaptic("taskDeleted");
    setShowMoveOptions(true);
  }, []);

  const handleBackFromMoveOptions = useCallback(() => {
    // Light tick when going back
    triggerTaskHaptic("taskDeleted");
    setShowMoveOptions(false);
  }, []);

  const currentIndex = COLUMN_ORDER.indexOf(task.status as Status);
  const availableStatuses = COLUMN_ORDER.filter(
    (_, index) => index !== currentIndex
  );

  if (!isOpen) return null;

  return (
    <div
      className={clsx(
        styles.contextMenuOverlay,
        isExiting && styles.contextMenuOverlayExiting
      )}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Task actions"
    >
      <div
        className={clsx(
          styles.contextMenu,
          isExiting && styles.contextMenuExiting
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.contextMenuHeader}>
          <span className={styles.contextMenuTitle}>{task.title}</span>
          <button
            className={styles.contextMenuClose}
            onClick={handleClose}
            aria-label="Close menu"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.contextMenuActions}>
          {!showMoveOptions ? (
            <>
              {/* Edit Action */}
              <button
                className={styles.contextMenuItem}
                onClick={handleEdit}
                aria-label="Edit task"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Task
              </button>

              {/* Set Active / Clear Active Action */}
              <button
                className={clsx(
                  styles.contextMenuItem,
                  !isActive && styles.contextMenuItemSuccess
                )}
                onClick={handleSetActive}
                aria-label={isActive ? "Clear active status" : "Set as active task"}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={isActive ? "none" : "currentColor"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {isActive ? "Clear Active" : "Set Active"}
              </button>

              {/* Move Action */}
              {availableStatuses.length > 0 && (
                <button
                  className={styles.contextMenuItem}
                  onClick={handleShowMoveOptions}
                  aria-label="Move to different column"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  Move to...
                </button>
              )}

              <div className={styles.contextMenuDivider} />

              {/* Delete Action */}
              <button
                className={clsx(styles.contextMenuItem, styles.contextMenuItemDanger)}
                onClick={handleDelete}
                aria-label="Delete task"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Delete
              </button>

              {/* Cancel Action */}
              <button
                className={clsx(styles.contextMenuItem, styles.contextMenuItemCancel)}
                onClick={handleClose}
                aria-label="Cancel"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Cancel
              </button>
            </>
          ) : (
            /* Move Options Submenu */
            <div className={styles.moveOptions}>
              <button
                className={styles.moveBack}
                onClick={handleBackFromMoveOptions}
                aria-label="Back to main menu"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>

              <div className={styles.contextMenuDivider} />

              {availableStatuses.map((status) => {
                const config = STATUS_CONFIG[status];
                return (
                  <button
                    key={status}
                    className={styles.moveOption}
                    onClick={() => handleMove(status)}
                    aria-label={`Move to ${config?.label}`}
                  >
                    <span
                      className={styles.moveOptionIndicator}
                      style={{ background: config?.color }}
                    />
                    {config?.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
