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
    <header className={styles.header}>
      <div className={styles.content}>
        <div className={styles.left}>
          <h1 className={styles.title}>Loom Board</h1>
          <span className={styles.statusBadge}>
            <span className={styles.statusDot} />
            Active
          </span>
        </div>
        <div className={styles.right}>
          <button className={styles.btn} onClick={onShowHistory}>
            &#x1F4CB; History
          </button>
          <span className={styles.taskCount}>
            {isLoading ? "Loading..." : `${taskCount} task${taskCount === 1 ? "" : "s"}`}
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
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
