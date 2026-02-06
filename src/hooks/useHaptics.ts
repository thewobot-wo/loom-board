/**
 * Comprehensive Haptic Feedback System for Loom Board Mobile
 * 
 * Provides delightful, tactile feedback for all user interactions.
 * Uses the Navigator.vibrate API with carefully crafted patterns.
 */

// Column-specific haptic patterns
export type ColumnHapticType = "backlog" | "inProgress" | "blocked" | "done";

// Task interaction haptic types
export type TaskHapticType = 
  | "longPressStart"
  | "taskCompleted"
  | "taskDeleted"
  | "taskCreated"
  | "priorityUrgent";

// Navigation haptic types
export type NavigationHapticType =
  | "swipeColumn"
  | "tapNavDot"
  | "pullToRefreshRelease";

// Error/Warning haptic types
export type ErrorHapticType =
  | "cantMoveFurther"
  | "deleteConfirmation"
  | "networkError";

// General haptic types
export type GeneralHapticType =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "pop"
  | "tick"
  | "thunk"
  | "celebration";

// Duration presets (in milliseconds)
const DURATIONS = {
  light: 10,
  medium: 20,
  heavy: 35,
  pop: 25,
  tick: 10,
  thunk: 20,
  shortGap: 10,
  mediumGap: 50,
  longGap: 100,
} as const;

// Haptic pattern definitions
const HAPTIC_PATTERNS = {
  // Column-specific patterns
  backlog: DURATIONS.tick,                          // Light tick (10ms)
  inProgress: DURATIONS.thunk,                      // Medium thunk (20ms)
  blocked: [10, 30, 10],                           // Double buzz warning
  done: [10, 50, 10, 50, 10],                      // Success celebration pattern

  // Task interaction patterns
  longPressStart: DURATIONS.pop,                    // Medium pop (25ms)
  taskCompleted: [10, 50, 10, 50, 10, 50, 10],     // Heavy celebration
  taskDeleted: DURATIONS.tick,                      // Light tick
  taskCreated: [15, 30, 15],                        // Satisfying pop
  priorityUrgent: [20, 40, 20, 40, 20],            // Warning buzz

  // Navigation patterns
  swipeColumn: DURATIONS.tick,                      // Light tick
  tapNavDot: DURATIONS.medium,                      // Medium confirmation
  pullToRefreshRelease: DURATIONS.thunk,            // Medium thunk

  // Error/Warning patterns
  cantMoveFurther: [15, 30, 15],                   // Double tap warning
  deleteConfirmation: [20, 40, 20],                // Warning buzz
  networkError: [50, 100, 50, 100, 50],            // Error pattern

  // General patterns
  light: DURATIONS.light,
  medium: DURATIONS.medium,
  heavy: DURATIONS.heavy,
  success: [10, 50, 10],
  warning: [20, 40, 20],
  error: [50, 100, 50],
  pop: DURATIONS.pop,
  tick: DURATIONS.tick,
  thunk: DURATIONS.thunk,
  celebration: [10, 50, 10, 50, 10, 50, 10],
} as const;

// Check if haptics are supported
const isHapticsSupported = (): boolean => {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
};

// Check if we're on a mobile device (rough check)
const isMobileDevice = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || ("ontouchstart" in window && window.innerWidth < 1024);
};

// User preference for haptics (stored in localStorage)
const HAPTICS_ENABLED_KEY = "loom-board-haptics-enabled";

/**
 * Check if haptics are enabled by user preference
 */
export const areHapticsEnabled = (): boolean => {
  if (typeof localStorage === "undefined") return true;
  const stored = localStorage.getItem(HAPTICS_ENABLED_KEY);
  return stored === null || stored === "true";
};

/**
 * Enable or disable haptics
 */
export const setHapticsEnabled = (enabled: boolean): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(HAPTICS_ENABLED_KEY, String(enabled));
};

/**
 * Core haptic trigger function
 */
export const triggerHaptic = (
  pattern: number | number[] | readonly number[],
  options?: { force?: boolean }
): boolean => {
  if (!isHapticsSupported()) return false;
  if (!options?.force && !areHapticsEnabled()) return false;
  if (!options?.force && !isMobileDevice()) return false;

  try {
    // Cast to VibratePattern - navigator.vibrate accepts number | number[]
    navigator.vibrate(pattern as number | number[]);
    return true;
  } catch (e) {
    console.warn("Haptic feedback failed:", e);
    return false;
  }
};

/**
 * Column-specific haptic feedback
 * Triggers different haptics based on which column the user interacts with
 */
export const triggerColumnHaptic = (
  column: ColumnHapticType,
  options?: { force?: boolean }
): boolean => {
  const pattern = HAPTIC_PATTERNS[column];
  return triggerHaptic(pattern, options);
};

/**
 * Task interaction haptic feedback
 */
export const triggerTaskHaptic = (
  action: TaskHapticType,
  options?: { force?: boolean }
): boolean => {
  const pattern = HAPTIC_PATTERNS[action];
  return triggerHaptic(pattern, options);
};

/**
 * Navigation haptic feedback
 */
export const triggerNavigationHaptic = (
  action: NavigationHapticType,
  options?: { force?: boolean }
): boolean => {
  const pattern = HAPTIC_PATTERNS[action];
  return triggerHaptic(pattern, options);
};

/**
 * Error/Warning haptic feedback
 */
export const triggerErrorHaptic = (
  type: ErrorHapticType,
  options?: { force?: boolean }
): boolean => {
  const pattern = HAPTIC_PATTERNS[type];
  return triggerHaptic(pattern, options);
};

/**
 * General haptic feedback (legacy compatibility)
 */
export const triggerGeneralHaptic = (
  type: GeneralHapticType,
  options?: { force?: boolean }
): boolean => {
  const pattern = HAPTIC_PATTERNS[type];
  return triggerHaptic(pattern, options);
};

/**
 * Legacy triggerHaptic for backward compatibility
 * Maps old type names to new system
 */
export const triggerLegacyHaptic = (
  type: "light" | "medium" | "heavy" | "success",
  options?: { force?: boolean }
): boolean => {
  return triggerGeneralHaptic(type as GeneralHapticType, options);
};

/**
 * Haptic feedback for status changes
 * Automatically determines the appropriate haptic based on target status
 */
export const triggerStatusChangeHaptic = (
  newStatus: string | undefined,
  options?: { force?: boolean }
): boolean => {
  if (!newStatus) return false;
  
  const statusMap: Record<string, ColumnHapticType> = {
    backlog: "backlog",
    "in-progress": "inProgress",
    blocked: "blocked",
    done: "done",
  };

  const columnType = statusMap[newStatus];
  if (columnType) {
    return triggerColumnHaptic(columnType, options);
  }
  return false;
};

/**
 * Sequential haptic pattern - triggers multiple haptics in sequence
 * Useful for creating more complex feedback
 */
export const triggerSequentialHaptics = async (
  patterns: Array<{ pattern: number | number[]; delay: number }>,
  options?: { force?: boolean }
): Promise<void> => {
  if (!isHapticsSupported()) return;
  if (!options?.force && !areHapticsEnabled()) return;

  for (const { pattern, delay } of patterns) {
    triggerHaptic(pattern, options);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

/**
 * Celebration haptic - extra satisfying feedback for achievements
 */
export const triggerCelebrationHaptic = (options?: { force?: boolean }): void => {
  triggerSequentialHaptics(
    [
      { pattern: 10, delay: 50 },
      { pattern: 20, delay: 50 },
      { pattern: 30, delay: 50 },
      { pattern: [20, 30, 20], delay: 0 },
    ],
    options
  );
};

/**
 * Priority change haptic - different feedback based on priority level
 */
export const triggerPriorityHaptic = (
  priority: "low" | "medium" | "high" | "urgent",
  options?: { force?: boolean }
): boolean => {
  const patterns: Record<typeof priority, number | number[]> = {
    low: 10,
    medium: 15,
    high: [10, 20, 10],
    urgent: [20, 40, 20, 40, 20] as number[],
  };

  return triggerHaptic(patterns[priority], options);
};

// React hook for haptics
import { useCallback } from "react";

interface UseHapticsReturn {
  trigger: (pattern: number | number[] | readonly number[], options?: { force?: boolean }) => boolean;
  column: (column: ColumnHapticType, options?: { force?: boolean }) => boolean;
  task: (action: TaskHapticType, options?: { force?: boolean }) => boolean;
  navigation: (action: NavigationHapticType, options?: { force?: boolean }) => boolean;
  error: (type: ErrorHapticType, options?: { force?: boolean }) => boolean;
  general: (type: GeneralHapticType, options?: { force?: boolean }) => boolean;
  statusChange: (newStatus: string | undefined, options?: { force?: boolean }) => boolean;
  priority: (priority: "low" | "medium" | "high" | "urgent", options?: { force?: boolean }) => boolean;
  celebrate: (options?: { force?: boolean }) => void;
  isSupported: boolean;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/**
 * React hook for using haptics in components
 */
export const useHaptics = (): UseHapticsReturn => {
  const trigger = useCallback(triggerHaptic, []);
  const column = useCallback(triggerColumnHaptic, []);
  const task = useCallback(triggerTaskHaptic, []);
  const navigation = useCallback(triggerNavigationHaptic, []);
  const error = useCallback(triggerErrorHaptic, []);
  const general = useCallback(triggerGeneralHaptic, []);
  const statusChange = useCallback(triggerStatusChangeHaptic, []);
  const priority = useCallback(triggerPriorityHaptic, []);
  const celebrate = useCallback(triggerCelebrationHaptic, []);

  return {
    trigger,
    column,
    task,
    navigation,
    error,
    general,
    statusChange,
    priority,
    celebrate,
    isSupported: isHapticsSupported(),
    isEnabled: areHapticsEnabled(),
    setEnabled: setHapticsEnabled,
  };
};

export default useHaptics;
