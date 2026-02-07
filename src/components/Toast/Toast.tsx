import { useState, useEffect, useCallback } from "react";
import { STATUS_CONFIG, type Status } from "@/lib/constants";
import styles from "./Toast.module.css";

interface ToastState {
  message: string;
  status: Status;
  id: number;
}

let toastCallback: ((toast: ToastState) => void) | null = null;
let toastIdCounter = 0;

// Global function to show toast - can be called from anywhere
export function showMoveToast(status: Status) {
  const message = `Moved to ${STATUS_CONFIG[status].label}`;
  toastIdCounter++;
  toastCallback?.({ message, status, id: toastIdCounter });
}

export function Toast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Register the callback
  useEffect(() => {
    toastCallback = (newToast) => {
      setToast(newToast);
      setIsVisible(true);
    };
    return () => {
      toastCallback = null;
    };
  }, []);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast?.id]);

  // Clean up toast after animation
  const handleAnimationEnd = useCallback(() => {
    if (!isVisible) {
      setToast(null);
    }
  }, [isVisible]);

  if (!toast) return null;

  const config = STATUS_CONFIG[toast.status];

  return (
    <div
      className={`${styles.toast} ${isVisible ? styles.visible : styles.hidden}`}
      onAnimationEnd={handleAnimationEnd}
      role="status"
      aria-live="polite"
    >
      <span
        className={styles.dot}
        style={{ backgroundColor: config.color }}
      />
      <span className={styles.message}>{toast.message}</span>
    </div>
  );
}
