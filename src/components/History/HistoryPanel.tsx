import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatTime } from "@/lib/utils";
import styles from "./HistoryPanel.module.css";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const activities = useQuery(api.activityHistory.getRecentActivity, { limit: 50 });

  const formatAction = (field: string, oldValue?: string, newValue?: string): string => {
    if (field === "_created") return "Created";
    if (field === "archived") {
      return newValue === "true" ? "Archived" : "Restored";
    }
    if (field === "status") {
      const from = oldValue ? JSON.parse(oldValue) : "unknown";
      const to = newValue ? JSON.parse(newValue) : "unknown";
      return `Moved: ${from} → ${to}`;
    }
    return `Updated ${field}`;
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.active : ""}`}
        onClick={onClose}
      />
      <div className={`${styles.panel} ${isOpen ? styles.active : ""}`}>
        <div className={styles.header}>
          <h3>Activity History</h3>
          <button className={styles.closeButton} onClick={onClose}>
            x
          </button>
        </div>
        <div className={styles.list}>
          {activities === undefined ? (
            <div className={styles.loading}>Loading history...</div>
          ) : activities.length === 0 ? (
            <div className={styles.empty}>No activity yet</div>
          ) : (
            activities.map((activity) => (
              <div key={activity._id} className={styles.item}>
                <span className={styles.time}>
                  {formatTime(activity._creationTime)}
                </span>
                <div className={styles.content}>
                  <div className={styles.action}>
                    {formatAction(activity.field, activity.oldValue, activity.newValue)}
                  </div>
                  <div className={styles.taskTitle}>
                    {activity.taskTitle ?? "Unknown task"}
                  </div>
                  {activity.field !== "_created" && activity.field !== "archived" && activity.field !== "status" && (
                    <div className={styles.fieldChange}>
                      {activity.oldValue && `"${JSON.parse(activity.oldValue)}" → `}
                      {activity.newValue && `"${JSON.parse(activity.newValue)}"`}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
