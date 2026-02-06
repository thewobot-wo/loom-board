import { useState, useCallback, useRef, useEffect } from "react";
import { COLUMN_ORDER, type Status } from "@/lib/constants";
import {
  triggerLegacyHaptic,
  triggerGeneralHaptic,
  triggerColumnHaptic,
  triggerNavigationHaptic,
  triggerTaskHaptic,
  triggerErrorHaptic,
  triggerStatusChangeHaptic,
} from "./useHaptics";

// Re-export for backward compatibility
export { triggerLegacyHaptic as triggerHaptic };

// Detect mobile screen
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

// Single column mobile navigation with enhanced haptics
export const useMobileNavigation = () => {
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const lastColumnIndex = useRef(0);

  const goToColumn = useCallback((index: number) => {
    if (index >= 0 && index < COLUMN_ORDER.length && !isTransitioning) {
      setIsTransitioning(true);
      
      // Track if this is a navigation change
      const isNavigating = index !== lastColumnIndex.current;
      lastColumnIndex.current = index;
      
      setCurrentColumnIndex(index);
      
      // Trigger appropriate haptic based on target column
      if (isNavigating) {
        const targetColumn = COLUMN_ORDER[index];
        if (targetColumn) {
          triggerColumnHaptic(targetColumn as "backlog" | "inProgress" | "blocked" | "done");
        }
      }
      
      setTimeout(() => setIsTransitioning(false), 300);
    } else if ((index < 0 || index >= COLUMN_ORDER.length) && !isTransitioning) {
      // Can't move further - trigger error haptic
      triggerErrorHaptic("cantMoveFurther");
    }
  }, [isTransitioning]);

  const goToNextColumn = useCallback(() => {
    if (currentColumnIndex < COLUMN_ORDER.length - 1) {
      goToColumn(currentColumnIndex + 1);
    } else {
      // At right edge - can't move further
      triggerErrorHaptic("cantMoveFurther");
    }
  }, [currentColumnIndex, goToColumn]);

  const goToPrevColumn = useCallback(() => {
    if (currentColumnIndex > 0) {
      goToColumn(currentColumnIndex - 1);
    } else {
      // At left edge - can't move further
      triggerErrorHaptic("cantMoveFurther");
    }
  }, [currentColumnIndex, goToColumn]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isSwiping.current) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    const deltaX = touchStartX.current - touch.clientX;
    const deltaY = touchStartY.current - touch.clientY;

    // Only detect horizontal swipes (prevent scroll interference)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      isSwiping.current = true;
      
      if (deltaX > 0) {
        // Swiping left (next column)
        if (currentColumnIndex < COLUMN_ORDER.length - 1) {
          goToNextColumn();
        } else {
          // Can't move further right
          triggerErrorHaptic("cantMoveFurther");
        }
      } else {
        // Swiping right (previous column)
        if (currentColumnIndex > 0) {
          goToPrevColumn();
        } else {
          // Can't move further left
          triggerErrorHaptic("cantMoveFurther");
        }
      }
    }
  }, [goToNextColumn, goToPrevColumn, currentColumnIndex]);

  const handleTouchEnd = useCallback(() => {
    isSwiping.current = false;
  }, []);

  return {
    currentColumn: COLUMN_ORDER[currentColumnIndex]!,
    currentColumnIndex,
    setCurrentColumnIndex,
    goToColumn,
    goToNextColumn,
    goToPrevColumn,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isTransitioning,
  };
};

// Swipe to move card with enhanced haptics
interface SwipeState {
  deltaX: number;
  isSwiping: boolean;
  direction: "left" | "right" | null;
  threshold: number;
}

export const useCardSwipe = (
  onMoveLeft: () => void,
  onMoveRight: () => void,
  enabled: boolean = true,
  currentStatus?: Status
) => {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    deltaX: 0,
    isSwiping: false,
    direction: null,
    threshold: 100,
  });
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const rafId = useRef<number | null>(null);
  const hasTriggeredHaptic = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    isHorizontalSwipe.current = false;
    hasTriggeredHaptic.current = false;
    
    setSwipeState(prev => ({ ...prev, isSwiping: false, deltaX: 0, direction: null }));
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    if (!touch) return;
    
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Determine if this is a horizontal swipe
    if (!isHorizontalSwipe.current && Math.abs(deltaX) > 10) {
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    if (isHorizontalSwipe.current) {
      e.preventDefault();
      
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      
      rafId.current = requestAnimationFrame(() => {
        const direction = deltaX > 0 ? "right" : "left";
        setSwipeState({
          deltaX,
          isSwiping: true,
          direction,
          threshold: 100,
        });

        // Trigger tick haptic when crossing threshold
        if (Math.abs(deltaX) > 100 && !hasTriggeredHaptic.current) {
          triggerGeneralHaptic("tick");
          hasTriggeredHaptic.current = true;
        } else if (Math.abs(deltaX) < 100) {
          hasTriggeredHaptic.current = false;
        }
      });
    }
  }, [enabled]);

  const handleTouchEnd = useCallback((_e?: React.TouchEvent) => {
    if (!enabled || !isHorizontalSwipe.current) {
      setSwipeState(prev => ({ ...prev, isSwiping: false, deltaX: 0 }));
      return;
    }

    const { deltaX, threshold } = swipeState;
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onMoveRight();
        // Trigger status-specific haptic if status provided
        if (currentStatus) {
          const currentIndex = COLUMN_ORDER.indexOf(currentStatus);
          if (currentIndex < COLUMN_ORDER.length - 1) {
            const nextStatus = COLUMN_ORDER[currentIndex + 1];
            if (nextStatus) {
              triggerStatusChangeHaptic(nextStatus);
            }
          }
        } else {
          triggerGeneralHaptic("success");
        }
      } else {
        onMoveLeft();
        // Trigger status-specific haptic if status provided
        if (currentStatus) {
          const currentIndex = COLUMN_ORDER.indexOf(currentStatus);
          if (currentIndex > 0) {
            const prevStatus = COLUMN_ORDER[currentIndex - 1];
            if (prevStatus) {
              triggerStatusChangeHaptic(prevStatus);
            }
          }
        } else {
          triggerGeneralHaptic("success");
        }
      }
    }

    setSwipeState(prev => ({ ...prev, isSwiping: false, deltaX: 0, direction: null }));
    isHorizontalSwipe.current = false;
    hasTriggeredHaptic.current = false;
  }, [enabled, swipeState, onMoveLeft, onMoveRight, currentStatus]);

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return {
    swipeState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};

// Long press for context menu with enhanced haptics
interface LongPressProps {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}

export const useLongPress = (
  onLongPress: () => void,
  onClick: () => void,
  duration: number = 500,
  onPressStart?: () => void,
  onPressEnd?: () => void
): LongPressProps => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartTime = useRef<number>(0);
  const isLongPress = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const hasTriggeredLongPress = useRef(false);
  const hasTriggeredStartHaptic = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    isLongPress.current = false;
    hasTriggeredLongPress.current = false;
    hasTriggeredStartHaptic.current = false;
    pressStartTime.current = Date.now();
    
    if ("touches" in e && e.touches[0]) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (!("touches" in e)) {
      touchStartPos.current = { x: e.clientX, y: e.clientY };
    }

    // Trigger visual feedback immediately
    onPressStart?.();
    
    // Trigger haptic at start of long press for immediate feedback
    if ("touches" in e) {
      triggerTaskHaptic("longPressStart");
      hasTriggeredStartHaptic.current = true;
    }

    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      hasTriggeredLongPress.current = true;
      if (!hasTriggeredStartHaptic.current) {
        triggerTaskHaptic("longPressStart");
      }
      // End visual feedback when menu opens
      onPressEnd?.();
      onLongPress();
    }, duration);
  }, [onLongPress, duration, onPressStart, onPressEnd]);

  const move = useCallback((_e?: React.TouchEvent | React.MouseEvent) => {
    if (timerRef.current && _e && "touches" in _e) {
      const touch = _e.touches[0];
      if (!touch) return;
      
      const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
      
      // Cancel if moved too much
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        // End visual feedback on movement
        onPressEnd?.();
      }
    }
  }, [onPressEnd]);

  const end = useCallback((_e?: React.TouchEvent | React.MouseEvent) => {
    // Always end visual feedback
    onPressEnd?.();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      
      // Only trigger click if it wasn't a long press
      if (!isLongPress.current && !hasTriggeredLongPress.current) {
        // Check if press was short enough to be a click
        const pressDuration = Date.now() - pressStartTime.current;
        if (pressDuration < duration) {
          onClick();
        }
      }
    }
    isLongPress.current = false;
    hasTriggeredStartHaptic.current = false;
  }, [onClick, duration, onPressEnd]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Always end visual feedback on cancel
    onPressEnd?.();
    isLongPress.current = false;
    hasTriggeredStartHaptic.current = false;
  }, [onPressEnd]);

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
    onMouseLeave: cancel,
  };
};

// Pull to refresh
export const usePullToRefresh = (
  onRefresh: () => Promise<void>,
  enabled: boolean = true
) => {
  const [pullState, setPullState] = useState({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
  });
  
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || pullState.isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;

    const touch = e.touches[0];
    if (!touch) return;

    // Only start pull if at top of scroll
    if (container.scrollTop <= 0) {
      touchStartY.current = touch.clientY;
      isPulling.current = true;
    }
  }, [enabled, pullState.isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !isPulling.current || pullState.isRefreshing) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - touchStartY.current;

    if (deltaY > 0 && deltaY < 150) {
      // Apply resistance
      const pullDistance = Math.min(deltaY * 0.5, 80);
      setPullState(prev => ({ ...prev, isPulling: true, pullDistance }));
    }
  }, [enabled, pullState.isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !isPulling.current) return;

    isPulling.current = false;

    if (pullState.pullDistance > 60) {
      setPullState(prev => ({ ...prev, isRefreshing: true }));
      // Medium thunk when releasing to refresh
      triggerNavigationHaptic("pullToRefreshRelease");
      
      try {
        await onRefresh();
      } finally {
        setPullState({ isPulling: false, pullDistance: 0, isRefreshing: false });
      }
    } else {
      setPullState({ isPulling: false, pullDistance: 0, isRefreshing: false });
    }
  }, [enabled, pullState.pullDistance, onRefresh]);

  return {
    containerRef,
    pullState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};

// Ripple effect for touch feedback
export const useRipple = () => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const triggerRipple = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    let x = 0;
    let y = 0;
    
    if ("touches" in e && e.touches[0]) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else if (!("touches" in e)) {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  }, []);

  return { ripples, triggerRipple };
};

// Get next/previous status for card movement
export const getAdjacentStatus = (currentStatus: Status, direction: "prev" | "next"): Status | null => {
  const currentIndex = COLUMN_ORDER.indexOf(currentStatus);
  
  if (currentIndex === -1) return null;
  
  if (direction === "next" && currentIndex < COLUMN_ORDER.length - 1) {
    return COLUMN_ORDER[currentIndex + 1] ?? null;
  }
  
  if (direction === "prev" && currentIndex > 0) {
    return COLUMN_ORDER[currentIndex - 1] ?? null;
  }
  
  return null;
};
