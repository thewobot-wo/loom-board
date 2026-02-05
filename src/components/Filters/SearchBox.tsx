import styles from "./FilterBar.module.css";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBox({ value, onChange, placeholder = "Search tasks..." }: SearchBoxProps) {
  return (
    <div className={styles.searchContainer}>
      <svg 
        className={styles.searchIcon}
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
