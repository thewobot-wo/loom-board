import { useHotkeys } from "react-hotkeys-hook";

interface KeyboardShortcutHandlers {
  onEscape?: () => void;
  onNewTask?: () => void;
  onSearch?: () => void;
  onToggleHistory?: () => void;
}

export function useKeyboardShortcuts({
  onEscape,
  onNewTask,
  onSearch,
  onToggleHistory,
}: KeyboardShortcutHandlers) {
  // Escape - close modals/panels
  useHotkeys(
    "escape",
    () => {
      onEscape?.();
    },
    { enableOnFormTags: false }
  );

  // Cmd/Ctrl + N - new task
  useHotkeys(
    "mod+n",
    (e) => {
      e.preventDefault();
      onNewTask?.();
    },
    { enableOnFormTags: false }
  );

  // / or Cmd/Ctrl + K - focus search
  useHotkeys(
    "/, mod+k",
    (e) => {
      e.preventDefault();
      onSearch?.();
    },
    { enableOnFormTags: false }
  );

  // Cmd/Ctrl + H - toggle history
  useHotkeys(
    "mod+h",
    (e) => {
      e.preventDefault();
      onToggleHistory?.();
    },
    { enableOnFormTags: false }
  );
}
