import { useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { PRIORITY_CONFIG, type Status, type Priority } from "@/lib/constants";
import clsx from "clsx";
import { TimeDisplay } from "./TimeDisplay";
import styles from "./TaskModal.module.css";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Doc<"tasks"> | null;
  defaultStatus?: Status;
}

const TAG_OPTIONS = ["project", "research", "bug", "feature", "maintenance", "cruise"];

export function TaskModal({ isOpen, onClose, task, defaultStatus = "backlog" }: TaskModalProps) {
  const createTask = useMutation(api.tasks.createTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const archiveTask = useMutation(api.tasks.archiveTask);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [selectedTags, setSelectedTags] = useState<string[]>(["project"]);
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!task;

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPriority(task.priority as Priority);
      setSelectedTags(task.tags.length > 0 ? task.tags : ["project"]);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] ?? "" : "");
    } else if (isOpen) {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setSelectedTags(["project"]);
      setDueDate("");
    }
  }, [isOpen, task]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    setIsSubmitting(true);

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        tags: selectedTags,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      };

      if (isEditing && task) {
        await updateTask({
          id: task._id,
          updates: taskData,
        });
        toast.success("Task updated");
      } else {
        await createTask({
          ...taskData,
          status: defaultStatus,
          order: Date.now(), // Simple ordering by creation time
        });
        toast.success("Task created");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save task");
      console.error("Failed to save task:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, priority, selectedTags, dueDate, isEditing, task, defaultStatus, createTask, updateTask, onClose]);

  const handleDelete = useCallback(async () => {
    if (!task) return;
    setIsSubmitting(true);

    try {
      await archiveTask({ id: task._id });
      toast.success("Task deleted");
      onClose();
    } catch (error) {
      toast.error("Failed to delete task");
      console.error("Failed to delete task:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [task, archiveTask, onClose]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleSave]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{isEditing ? "Edit Task" : "New Task"}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            x
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Tags</label>
              <div className={styles.tagsInput}>
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={clsx(
                      styles.tagOption,
                      selectedTags.includes(tag) && styles.selected
                    )}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="dueDate">Due Date</label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Priority</label>
            <div className={styles.priorityOptions}>
              {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG.urgent][]).map(
                ([key, config]) => {
                  const priorityStyleMap: Record<Priority, string | undefined> = {
                    urgent: styles.priorityUrgent,
                    high: styles.priorityHigh,
                    medium: styles.priorityMedium,
                    low: styles.priorityLow,
                  };
                  return (
                    <button
                      key={key}
                      type="button"
                      className={clsx(
                        styles.priorityOption,
                        priorityStyleMap[key],
                        priority === key && styles.selected
                      )}
                      onClick={() => setPriority(key)}
                    >
                      {config.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Time tracking info (edit mode only, when task has time data) */}
          {isEditing && task && (task.timeSpentMs || task.lastResumedAt || task.startedAt || task.completedAt) && (
            <div className={styles.formGroup}>
              <label>Time Tracking</label>
              <TimeDisplay
                timeSpentMs={task.timeSpentMs}
                lastResumedAt={task.lastResumedAt}
                startedAt={task.startedAt}
                completedAt={task.completedAt}
                status={task.status}
                compact={false}
              />
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {isEditing && (
            <button
              className={clsx(styles.btn, styles.btnDanger)}
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Delete
            </button>
          )}
          <button
            className={styles.btn}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className={clsx(styles.btn, styles.btnPrimary)}
            onClick={handleSave}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? "Saving..." : "Save Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
