import { useState, useCallback, useMemo } from "react";
import type { Doc } from "../../convex/_generated/dataModel";

export interface FilterState {
  searchQuery: string;
  activeTags: string[];
}

export function useFilters(tasks: Doc<"tasks">[] | undefined) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setActiveTags([]);
  }, []);

  const hasActiveFilters = searchQuery.length > 0 || activeTags.length > 0;

  const filteredTasks = useMemo(() => {
    if (!tasks) return undefined;

    return tasks.filter((task) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          task.title.toLowerCase().includes(query) ||
          (task.description?.toLowerCase().includes(query) ?? false);
        if (!matchesSearch) return false;
      }

      // Tag filter (OR logic - any matching tag passes)
      if (activeTags.length > 0) {
        const hasMatchingTag = task.tags.some((tag) => activeTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, activeTags]);

  return {
    searchQuery,
    setSearchQuery,
    activeTags,
    toggleTag,
    clearFilters,
    hasActiveFilters,
    filteredTasks,
  };
}
