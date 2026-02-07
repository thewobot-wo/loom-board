import { useState, useRef, useEffect, useCallback } from "react";
import clsx from "clsx";
import { useIsMobile } from "@/hooks";
import { SearchBox } from "./SearchBox";
import styles from "./FilterBar.module.css";

const TAG_OPTIONS = ["All", "project", "research", "bug", "feature", "maintenance", "cruise"];

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTags: string[];
  onTagToggle: (tag: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  activeTags,
  onTagToggle,
  onClearFilters,
  hasActiveFilters,
}: FilterBarProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const searchIconRef = useRef<HTMLButtonElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Handle outside click to collapse
  useEffect(() => {
    if (!isMobile || !isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        // Return focus to search icon
        setTimeout(() => searchIconRef.current?.focus(), 0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, isExpanded]);

  // Handle Escape key to collapse
  useEffect(() => {
    if (!isMobile || !isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpanded(false);
        // Return focus to search icon
        setTimeout(() => searchIconRef.current?.focus(), 0);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isExpanded]);

  const handleExpandClick = useCallback(() => {
    setIsExpanded(true);
  }, []);

  // Mobile: collapsed by default, show search icon button
  if (isMobile && !isExpanded) {
    return (
      <div className={styles.filters}>
        <button
          ref={searchIconRef}
          className={styles.searchIconButton}
          onClick={handleExpandClick}
          aria-label="Open search and filters"
          aria-expanded={false}
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
            />
          </svg>
          {hasActiveFilters && <span className={styles.filterIndicator} />}
        </button>
      </div>
    );
  }

  // Desktop or mobile expanded
  return (
    <div
      ref={filterBarRef}
      className={clsx(styles.filters, isMobile && styles.filtersMobileExpanded)}
    >
      <SearchBox value={searchQuery} onChange={onSearchChange} />

      {TAG_OPTIONS.map((tag) => {
        const isAll = tag === "All";
        const isActive = isAll ? activeTags.length === 0 : activeTags.includes(tag);

        return (
          <button
            key={tag}
            className={clsx(styles.chip, isActive && styles.active)}
            data-testid={`filter-chip-${tag.toLowerCase()}`}
            onClick={() => {
              if (isAll) {
                onClearFilters();
              } else {
                onTagToggle(tag);
              }
            }}
          >
            {tag.charAt(0).toUpperCase() + tag.slice(1)}
          </button>
        );
      })}

      {hasActiveFilters && (
        <button className={styles.clearButton} onClick={onClearFilters}>
          Clear All
        </button>
      )}
    </div>
  );
}
