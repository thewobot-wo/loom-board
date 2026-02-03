import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { formatDate } from "@/lib/utils";
import styles from "./ArchiveSection.module.css";

interface ArchiveSectionProps {
  archivedTasks: Doc<"tasks">[];
}

export function ArchiveSection({ archivedTasks }: ArchiveSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const restoreTask = useMutation(api.tasks.restoreTask);

  const handleRestore = useCallback(
    async (taskId: Id<"tasks">) => {
      try {
        await restoreTask({ id: taskId });
        toast.success("Task restored to backlog");
      } catch (error) {
        toast.error("Failed to restore task");
        console.error("Failed to restore:", error);
      }
    },
    [restoreTask]
  );

  if (archivedTasks.length === 0) {
    return null;
  }

  return (
    <>
      <button
        className={styles.toggle}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? "Hide Archive" : `Show Archive (${archivedTasks.length})`}
      </button>

      {isOpen && (
        <div className={styles.section}>
          <div className={styles.grid}>
            {archivedTasks.map((task) => (
              <div
                key={task._id}
                className={styles.task}
                onClick={() => handleRestore(task._id)}
              >
                <div className={styles.taskTitle}>{task.title}</div>
                <div className={styles.taskMeta}>
                  {task.tags.join(", ")} &bull; Archived {formatDate(task.updatedAt)}
                </div>
                <div className={styles.restoreHint}>Click to restore</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
