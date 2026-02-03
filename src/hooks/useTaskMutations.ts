import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Status, Priority } from "@/lib/constants";

export interface TaskUpdates {
  title?: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  tags?: string[];
  dueDate?: number;
  order?: number;
}

export function useTaskMutations() {
  // Update task with optimistic update for status changes (drag-drop)
  const updateTask = useMutation(api.tasks.updateTask).withOptimisticUpdate(
    (localStore, args) => {
      // Only apply optimistic update for status changes (drag-drop)
      if (!args.updates.status) return;

      const currentTasks = localStore.getQuery(api.tasks.listTasks, {});
      if (currentTasks === undefined) return;

      // Find and update the task locally
      const updatedTasks = currentTasks.map((task) =>
        task._id === args.id
          ? { ...task, status: args.updates.status!, updatedAt: Date.now() }
          : task
      );

      localStore.setQuery(api.tasks.listTasks, {}, updatedTasks);
    }
  );

  // Create task (no optimistic update - wait for server ID)
  const createTask = useMutation(api.tasks.createTask);

  // Archive task with optimistic update
  const archiveTask = useMutation(api.tasks.archiveTask).withOptimisticUpdate(
    (localStore, args) => {
      const currentTasks = localStore.getQuery(api.tasks.listTasks, {});
      if (currentTasks === undefined) return;

      // Remove task from list (archived tasks are filtered out)
      const updatedTasks = currentTasks.filter((task) => task._id !== args.id);
      localStore.setQuery(api.tasks.listTasks, {}, updatedTasks);
    }
  );

  // Restore task (no optimistic update - task not in current list)
  const restoreTask = useMutation(api.tasks.restoreTask);

  return {
    updateTask,
    createTask,
    archiveTask,
    restoreTask,
  };
}
