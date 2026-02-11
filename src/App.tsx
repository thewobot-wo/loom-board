import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { useFilters, useAutoArchive, useKeyboardShortcuts, useIsMobile } from "@/hooks";
import { COLUMN_ORDER, type Status } from "@/lib/constants";
import { Header } from "@/components/Header";
import { ActiveTaskBanner } from "@/components/ActiveTaskBanner";
import { FilterBar } from "@/components/Filters";
import { Board } from "@/components/Board";
import { TaskModal } from "@/components/Task";
import { HistoryPanel } from "@/components/History";
import { ArchiveSection } from "@/components/Archive";
import { Toast } from "@/components/Toast";
import { LoginScreen } from "@/components/Auth";
import { MigrationModal } from "@/components/Migration";
import { hasMigrated, readLocalStorageTasks, markMigrated } from "@/lib/migration";

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
  const isMobile = useIsMobile();
  const tasks = useQuery(api.tasks.listTasks);
  const activeTask = useQuery(api.tasks.getActiveTask);
  const clearActiveTaskMutation = useMutation(api.tasks.clearActiveTask);
  // Skip archive query on mobile to avoid fetching data that won't be displayed
  const archivedTasks = useQuery(
    api.tasks.listArchivedTasks,
    isMobile ? "skip" : undefined
  );

  // Migration auto-detection
  const [showMigration, setShowMigration] = useState(false);

  useEffect(() => {
    if (!hasMigrated()) {
      const localTasks = readLocalStorageTasks();
      if (localTasks && localTasks.filter((t) => !t.archived).length > 0) {
        setShowMigration(true);
      } else {
        markMigrated(); // No data to migrate, prevent future checks
      }
    }
  }, []);

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

  // Calculate total tasks by status (before filtering) for empty state differentiation
  const totalTasksByStatus = useMemo(() => {
    if (!tasks) return undefined;
    return COLUMN_ORDER.reduce((acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status).length;
      return acc;
    }, {} as Record<Status, number>);
  }, [tasks]);

  // Get active task ID
  const activeTaskId = useMemo(() => {
    return tasks?.find((t) => t.isActive)?._id ?? null;
  }, [tasks]);

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

  const handleClearActiveTask = useCallback(() => {
    clearActiveTaskMutation();
  }, [clearActiveTaskMutation]);

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
      {showMigration && (
        <MigrationModal
          onComplete={() => setShowMigration(false)}
          onSkip={() => {
            markMigrated();
            setShowMigration(false);
          }}
        />
      )}

      <Header
        taskCount={filteredTasks?.length ?? 0}
        isLoading={tasks === undefined}
        onShowHistory={handleShowHistory}
      />

      {activeTask && (
        <ActiveTaskBanner task={activeTask} onClear={handleClearActiveTask} />
      )}

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
        activeTaskId={activeTaskId}
        totalTasksByStatus={totalTasksByStatus}
        hasActiveFilters={hasActiveFilters}
      />

      <ArchiveSection archivedTasks={archivedTasks ?? []} />

      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={editingTask}
        defaultStatus={defaultStatus}
        activeTaskId={activeTaskId}
      />

      <HistoryPanel isOpen={isHistoryOpen} onClose={handleCloseHistory} />

      {/* Toast for task move notifications on mobile */}
      {isMobile && <Toast />}
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
