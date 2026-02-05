import { useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import styles from "./Header.module.css";

interface HeaderProps {
  taskCount: number;
  isLoading: boolean;
  onShowHistory?: () => void;
}

export function Header({ taskCount, isLoading, onShowHistory }: HeaderProps) {
  const user = useQuery(api.users.getCurrentUser);
  const activeTask = useQuery(api.tasks.getActiveTask);
  const { signOut } = useAuthActions();
  const [imgFailed, setImgFailed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const showAvatar = user?.image && !imgFailed;

  return (
    <>
      <header className={styles.header}>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.2"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.4"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.6"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor"/>
                </svg>
              </div>
              <h1 className={styles.title}>Loom Board</h1>
            </div>
            <span className={styles.statusBadge}>
              <span className={styles.statusDot} />
              Active
            </span>
          </div>
          <div className={styles.right}>
            <button className={styles.btn} onClick={onShowHistory}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              History
            </button>
            <span className={styles.taskCount}>
              {isLoading ? (
                <span className={styles.pulse}>Loading...</span>
              ) : (
                <>
                  <span className={styles.countNumber}>{taskCount}</span>
                  <span className={styles.countLabel}>task{taskCount === 1 ? "" : "s"}</span>
                </>
              )}
            </span>

            {/* User section */}
            <div className={styles.userSection}>
              <div className={styles.userInfo}>
                {showAvatar ? (
                  <img
                    src={user.image}
                    alt=""
                    className={styles.avatar}
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {getInitials(user?.name)}
                  </div>
                )}
                {user?.name && (
                  <span className={styles.userName}>{user.name}</span>
                )}
              </div>
              <button
                className={styles.signOutBtn}
                onClick={handleSignOut}
                title="Sign out"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Currently Working On Banner */}
      {activeTask && (
        <div className={styles.activeTaskBanner}>
          <div className={styles.activeTaskContent}>
            <div className={styles.activeTaskLabel}>
              <span className={styles.activeTaskIcon}>🔥</span>
              Currently Working On
            </div>
            <div className={styles.activeTaskTitle}>{activeTask.title}</div>
            <div className={styles.activeTaskMeta}>
              <span className={`${styles.priorityBadge} ${styles[`priority_${activeTask.priority}`]}`}>
                {activeTask.priority.toUpperCase()}
              </span>
              <span className={styles.statusBadgeMini}>
                {activeTask.status.replace('_', ' ')}
              </span>
              {activeTask.tags.length > 0 && (
                <span className={styles.tags}>
                  {activeTask.tags.slice(0, 3).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
