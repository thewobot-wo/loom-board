export { useTaskMutations } from "./useTaskMutations";
export type { TaskUpdates } from "./useTaskMutations";
export { useFilters } from "./useFilters";
export type { FilterState } from "./useFilters";
export { useAutoArchive } from "./useAutoArchive";
export { useTimeTracking } from "./useTimeTracking";
export { useKeyboardShortcuts } from "./useKeyboardShortcuts";
export {
  useIsMobile,
  usePullToRefresh,
} from "./useMobileGestures";

// Comprehensive haptic feedback system
export {
  useHaptics,
  triggerHaptic,
  triggerColumnHaptic,
  triggerTaskHaptic,
  triggerNavigationHaptic,
  triggerErrorHaptic,
  triggerGeneralHaptic,
  triggerLegacyHaptic,
  triggerStatusChangeHaptic,
  triggerPriorityHaptic,
  triggerCelebrationHaptic,
  areHapticsEnabled,
  setHapticsEnabled,
} from "./useHaptics";
export type {
  ColumnHapticType,
  TaskHapticType,
  NavigationHapticType,
  ErrorHapticType,
  GeneralHapticType,
} from "./useHaptics";
