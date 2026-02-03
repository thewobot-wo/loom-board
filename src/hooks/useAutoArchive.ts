import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function useAutoArchive(tasks: Doc<"tasks">[] | undefined) {
  const archiveTask = useMutation(api.tasks.archiveTask);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tasks) return;

    const now = Date.now();
    const doneTasks = tasks.filter((t) => t.status === "done" && !t.archived);

    doneTasks.forEach((task) => {
      // Check if task has been done for more than 7 days
      const completedAt = task.updatedAt; // Using updatedAt as completion time
      const isOld = now - completedAt > SEVEN_DAYS_MS;

      if (isOld && !processedRef.current.has(task._id)) {
        processedRef.current.add(task._id);
        archiveTask({ id: task._id }).catch((err) => {
          console.error("Failed to auto-archive:", err);
          processedRef.current.delete(task._id);
        });
      }
    });
  }, [tasks, archiveTask]);
}
