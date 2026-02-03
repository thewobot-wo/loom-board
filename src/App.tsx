import { useState, useCallback } from "react";
import { useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { useFilters, useAutoArchive, useKeyboardShortcuts } from "@/hooks";
import { Header } from "@/components/Header";
import { FilterBar } from "@/components/Filters";
import { Board } from "@/components/Board";
import { TaskModal } from "@/components/Task";
import { HistoryPanel } from "@/components/History";
import { ArchiveSection } from "@/components/Archive";
import { LoginScreen } from "@/components/Auth";
import type { Status } from "@/lib/constants";

// Loading spinner component for auth check
function AuthLoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-primary)",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid var(--border)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
        <span style={{ color: "var(--text-secondary)" }}>Loading...</span>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Main board content (extracted from old App)
function BoardContent() {
  const tasks = useQuery(api.tasks.listTasks);
  const archivedTasks = useQuery(api.tasks.listArchivedTasks);

  // Auto-archive old done tasks
  useAutoArchive(tasks);

  // Filter state
  const {
    searchQuery,
    setSearchQuery,
    activeTags,
    toggleTag,
    clearFilters,
    hasActiveFilters,
    filteredTasks,
  } = useFilters(tasks);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Doc<"tasks"> | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Status>("backlog");

  // History panel state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleAddTask = useCallback((status: Status) => {
    setEditingTask(null);
    setDefaultStatus(status);
    setIsModalOpen(true);
  }, []);

  const handleEditTask = useCallback(
    (taskId: string) => {
      const task = tasks?.find((t) => t._id === taskId);
      if (task) {
        setEditingTask(task);
        setDefaultStatus(task.status as Status);
        setIsModalOpen(true);
      }
    },
    [tasks]
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTask(null);
  }, []);

  const handleShowHistory = useCallback(() => {
    setIsHistoryOpen(true);
  }, []);

  const handleCloseHistory = useCallback(() => {
    setIsHistoryOpen(false);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: () => {
      if (isModalOpen) {
        handleCloseModal();
      } else if (isHistoryOpen) {
        handleCloseHistory();
      }
    },
    onNewTask: () => {
      handleAddTask("backlog");
    },
    onSearch: () => {
      const searchInput = document.querySelector(
        'input[placeholder*="Search"]'
      ) as HTMLInputElement;
      searchInput?.focus();
    },
    onToggleHistory: () => {
      setIsHistoryOpen((prev) => !prev);
    },
  });

  return (
    <main>
      <Header
        taskCount={filteredTasks?.length ?? 0}
        isLoading={tasks === undefined}
        onShowHistory={handleShowHistory}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTags={activeTags}
        onTagToggle={toggleTag}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <Board
        tasks={filteredTasks}
        onAddTask={handleAddTask}
        onEditTask={handleEditTask}
      />

      <ArchiveSection archivedTasks={archivedTasks ?? []} />

      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={editingTask}
        defaultStatus={defaultStatus}
      />

      <HistoryPanel isOpen={isHistoryOpen} onClose={handleCloseHistory} />
    </main>
  );
}

function App() {
  return (
    <>
      <AuthLoading>
        <AuthLoadingScreen />
      </AuthLoading>

      <Unauthenticated>
        <LoginScreen />
      </Unauthenticated>

      <Authenticated>
        <BoardContent />
      </Authenticated>
    </>
  );
}

export default App;
