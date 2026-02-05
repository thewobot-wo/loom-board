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
      <header className={styles.header} data-active-task={!!activeTask}>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.brand}>
              <img 
                src="/logo.jpg" 
                alt="Chromolume" 
                className={styles.logo}
                onError={() => setImgFailed(true)}
              />
              <div className={styles.titleGroup}>
                <h1 className={styles.title}>Loom Board</h1>
                <span className={styles.subtitle}>Chromolume #7</span>
              </div>
            </div>
            {activeTask && (
              <div className={styles.activeTaskIndicator}>
                <div className={styles.activeTaskPulse} />
                <span className={styles.activeTaskLabel}>Currently working on</span>
                <span className={styles.activeTaskTitle}>{activeTask.title}</span>
              </div>
            )}
          </div>
          <div className={styles.right}>
            <button className={styles.btn} onClick={onShowHistory}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
              </svg>
              History
            </button>
            <span className={styles.taskCount}>
              {isLoading ? "..." : <><span className={styles.countNumber}>{taskCount}</span> tasks</>}
            </span>

            <div className={styles.userSection}>
              <div className={styles.userInfo}>
                {showAvatar ? (
                  <img src={user.image} alt="" className={styles.avatar} onError={() => setImgFailed(true)} />
                ) : (
                  <div className={styles.avatarPlaceholder}>{getInitials(user?.name)}</div>
                )}
                {user?.name && <span className={styles.userName}>{user.name}</span>}
              </div>
              <button className={styles.signOutBtn} onClick={handleSignOut} title="Sign out">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5m5 5H9"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
