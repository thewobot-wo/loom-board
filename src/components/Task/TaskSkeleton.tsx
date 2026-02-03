import clsx from "clsx";
import styles from "./TaskCard.module.css";

export function TaskSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={clsx(styles.skeletonLine, styles.skeletonTitle)} />
      <div className={clsx(styles.skeletonLine, styles.skeletonDesc)} />
      <div className={clsx(styles.skeletonLine, styles.skeletonMeta)} />
    </div>
  );
}
