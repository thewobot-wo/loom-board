import { TaskSkeleton } from "@/components/Task";
import styles from "./Column.module.css";

interface ColumnSkeletonProps {
  count?: number;
}

export function ColumnSkeleton({ count = 3 }: ColumnSkeletonProps) {
  return (
    <div className={`${styles.column} ${styles.skeleton}`}>
      <div className={styles.header}>
        <span className={styles.title}>
          <span className={styles.icon} style={{ background: "var(--border)" }} />
          Loading...
        </span>
        <span className={styles.count}>-</span>
      </div>
      <div className={styles.taskList}>
        {Array.from({ length: count }).map((_, i) => (
          <TaskSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
