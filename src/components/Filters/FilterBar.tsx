import clsx from "clsx";
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
  return (
    <div className={styles.filters}>
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
