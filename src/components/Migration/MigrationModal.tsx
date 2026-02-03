import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import {
  readLocalStorageTasks,
  isValidV1Task,
  transformTask,
  markMigrated,
  clearLocalStorageTasks,
} from "@/lib/migration";
import styles from "./MigrationModal.module.css";

interface MigrationModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function MigrationModal({ onComplete, onSkip }: MigrationModalProps) {
  const migrateLocalTasks = useMutation(api.migration.migrateLocalTasks);
  const [isMigrating, setIsMigrating] = useState(false);
  const [validCount, setValidCount] = useState(0);
  const [totalActive, setTotalActive] = useState(0);

  useEffect(() => {
    const tasks = readLocalStorageTasks();
    if (tasks) {
      const active = tasks.filter((t) => !t.archived);
      const valid = active.filter((t) => isValidV1Task(t));
      setTotalActive(active.length);
      setValidCount(valid.length);
    }
  }, []);

  async function handleMigrate() {
    setIsMigrating(true);
    try {
      const tasks = readLocalStorageTasks();
      if (!tasks) {
        toast.error("Could not read localStorage data.");
        setIsMigrating(false);
        return;
      }

      const active = tasks.filter((t) => !t.archived);
      const valid = active.filter((t) => isValidV1Task(t));
      const transformed = valid.map((task, index) =>
        transformTask(task, index)
      );

      const result = await migrateLocalTasks({ tasks: transformed });

      const skipped = totalActive - validCount;
      if (skipped > 0) {
        toast.success(
          `Imported ${result.imported} of ${totalActive} tasks`
        );
      } else {
        toast.success(`Imported ${result.imported} tasks successfully`);
      }

      clearLocalStorageTasks();
      markMigrated();
      onComplete();
    } catch {
      toast.error("Migration failed. Please try again.");
      setIsMigrating(false);
    }
  }

  // No valid tasks but raw data existed
  if (validCount === 0 && totalActive === 0) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Migrate Local Data</h2>
          </div>
          <div className={styles.body}>
            <p>No valid tasks found in browser storage.</p>
          </div>
          <div className={styles.footer}>
            <button
              className={`${styles.btn} ${styles.btnMigrate}`}
              onClick={onSkip}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Migrate Local Data</h2>
        </div>
        <div className={styles.body}>
          {isMigrating ? (
            <p className={styles.progressText}>Importing tasks...</p>
          ) : (
            <p>
              Found <span className={styles.taskCount}>{validCount} tasks</span>{" "}
              in your browser storage. Would you like to import them to your
              account?
            </p>
          )}
        </div>
        <div className={styles.footer}>
          <button
            className={`${styles.btn} ${styles.btnSkip} ${isMigrating ? styles.loading : ""}`}
            onClick={onSkip}
            disabled={isMigrating}
          >
            Skip
          </button>
          <button
            className={`${styles.btn} ${styles.btnMigrate} ${isMigrating ? styles.loading : ""}`}
            onClick={handleMigrate}
            disabled={isMigrating}
          >
            Migrate {validCount} Tasks
          </button>
        </div>
      </div>
    </div>
  );
}
