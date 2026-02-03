import styles from "./FilterBar.module.css";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBox({ value, onChange, placeholder = "Search tasks..." }: SearchBoxProps) {
  return (
    <div className={styles.searchContainer}>
      <span className={styles.searchIcon}>&#x1F50D;</span>
      <input
        type="text"
        className={styles.searchInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
