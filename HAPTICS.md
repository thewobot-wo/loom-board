# Loom Board Haptic Feedback System

## Overview
A comprehensive, delightful haptic feedback system for the Loom Board mobile app. Provides tactile responses for all user interactions to create a more engaging and satisfying experience.

## Features Implemented

### 1. Column-Specific Haptics
Each column has a unique haptic signature:
- **Backlog**: Light tick (10ms)
- **In Progress**: Medium thunk (20ms)  
- **Blocked**: Double buzz warning (10, 30ms)
- **Done**: Success celebration pattern (10, 50, 10, 50, 10ms)

### 2. Task Interactions
- **Long press start**: Medium pop (25ms)
- **Task completed (moved to Done)**: Heavy celebration pattern
- **Task deleted**: Light tick
- **Task created**: Satisfying pop pattern (15, 30, 15ms)
- **Priority set to Urgent**: Warning buzz (20, 40, 20, 40, 20ms)

### 3. Navigation
- **Swipe to new column**: Column-specific haptic + Light tick feedback
- **Tap nav dot**: Medium confirmation (20ms)
- **Pull to refresh release**: Medium thunk (20ms)

### 4. Error/Warning States
- **Can't move further left/right**: Double tap warning (15, 30, 15ms)
- **Delete confirmation**: Warning buzz (20, 40, 20ms)
- **Network error**: Error pattern (50, 100, 50, 100, 50ms)

## Files Created

### `/src/hooks/useHaptics.ts`
Comprehensive haptic system with:
- Type-safe haptic triggers for different interaction types
- User preference persistence (localStorage)
- Mobile device detection
- React hook (`useHaptics`) for easy component integration
- Celebration and sequential haptic patterns
- Priority-based haptic feedback

**Key Exports:**
- `useHaptics()` - React hook
- `triggerHaptic()` - Core trigger function
- `triggerColumnHaptic()` - Column-specific feedback
- `triggerTaskHaptic()` - Task interaction feedback
- `triggerNavigationHaptic()` - Navigation feedback
- `triggerErrorHaptic()` - Error/warning feedback
- `triggerStatusChangeHaptic()` - Auto-detect status haptic
- `areHapticsEnabled()` / `setHapticsEnabled()` - User preferences

## Files Modified

### `/src/hooks/useMobileGestures.ts`
Enhanced with:
- Column-specific haptics when navigating between columns
- Error haptics when trying to swipe past boundaries
- Status-aware card swipe haptics
- Long press haptics for context menu
- Pull-to-refresh release haptics

### `/src/components/Board/Board.tsx`
- Added column-specific haptics when dragging tasks
- Task completion celebration when moved to Done
- Task deleted haptic on deletion
- Navigation dot tap haptics

### `/src/components/Task/TaskCard.tsx`
- Status-specific haptics on card swipe
- Boundary haptics when can't move further
- Long press haptic feedback

### `/src/components/Task/TaskContextMenu.tsx`
- Menu open haptic
- Move options navigation haptics
- Delete confirmation warning haptic
- Selection feedback haptics

### `/src/hooks/index.ts`
- Exported all haptic functions and types

## Usage Example

```tsx
import { useHaptics, triggerTaskHaptic } from "@/hooks";

function MyComponent() {
  const { column, task, navigation, error, celebrate } = useHaptics();
  
  const handleSomething = () => {
    // Use the hook methods
    column("done");
    task("taskCompleted");
    
    // Or use standalone functions
    triggerTaskHaptic("taskCreated");
  };
  
  return <button onClick={handleSomething}>Do Something</button>;
}
```

## Technical Details

### Haptic Patterns
All patterns are defined as vibration durations in milliseconds:
- Single number: Simple vibration
- Array: Pattern of [vibrate, pause, vibrate, pause, ...]

### Browser Support
- Uses `navigator.vibrate()` API
- Gracefully degrades on unsupported devices
- Detects mobile vs desktop for appropriate feedback

### User Preferences
- Stores haptic preference in localStorage (`loom-board-haptics-enabled`)
- Defaults to enabled
- Can be toggled programmatically

## Mobile Experience
The haptic system is designed specifically for mobile touch interactions, providing:
- Immediate feedback on touch
- Different patterns for different actions
- Non-intrusive but noticeable vibrations
- Celebratory feedback for achievements (moving to Done)
