import { useState, useEffect, useRef } from "react";

/**
 * Hook that returns the current elapsed time in ms for a task,
 * updating every second when the timer is running.
 */
export function useTimeTracking(
  timeSpentMs: number | undefined,
  lastResumedAt: number | undefined
): number {
  const accumulated = timeSpentMs ?? 0;
  const isRunning = !!lastResumedAt;

  const [elapsed, setElapsed] = useState(() => {
    if (isRunning && lastResumedAt) {
      return accumulated + (Date.now() - lastResumedAt);
    }
    return accumulated;
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (isRunning && lastResumedAt) {
      // Update immediately
      setElapsed(accumulated + (Date.now() - lastResumedAt));

      // Then update every second
      intervalRef.current = setInterval(() => {
        setElapsed(accumulated + (Date.now() - lastResumedAt));
      }, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsed(accumulated);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [accumulated, lastResumedAt, isRunning]);

  return elapsed;
}
