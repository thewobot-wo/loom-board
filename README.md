# Loom Board

A polished, self-hosted Kanban board for tracking tasks with AI assistants.

![Loom Board](screenshot.png)

## Dev (Vite + Convex)

This repo includes a Vite + React app in `src/` backed by Convex (including Google auth via `@convex-dev/auth`).

1. Install deps: `npm install`
2. Create `.env.local` from `.env.example` and set `VITE_CONVEX_URL`
3. Run: `npm run dev`

Note: backend secrets are set on the Convex deployment with `npx convex env set ...` (do not commit `.env.local`).

## Features

### Core
- **4 columns:** Backlog → In Progress → Blocked → Done
- **Drag & drop** between columns with smooth animations
- **Rich task cards:** titles, descriptions, due dates, priority levels
- **Smart archive:** Auto-archives tasks done >7 days ago

### Organization
- **Search:** Instantly find tasks by title or description
- **Filter by tag:** Project, Research, Bug, Feature, Maintenance, Cruise
- **Priority levels:** P0 Critical (red), P1 High (yellow), P2 Normal (blue), P3 Low (gray)
- **Due dates:** Visual indicators for overdue (red) and soon-due (yellow) tasks

### UI/UX
- **Modern dark theme:** GitHub-inspired color palette
- **Current task banner:** Shows active work with elapsed time
- **Activity history:** Full history panel with 50 recent actions
- **Toast notifications:** Non-intrusive success/error feedback
- **Keyboard shortcuts:** `Esc` to close, `Cmd+Enter` to save

## Quick Start

1. Clone or download this repo
2. Open `loom-board.html` in any browser
3. Click **Import** to load `task-board.json` (or start fresh)
4. Drag to prioritize, double-click to edit

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close modal |
| `Cmd/Ctrl + Enter` | Save task |
| `Double-click` task | Edit task |

## File Structure

```
loom-board/
├── loom-board.html    # The app (single file, no dependencies)
├── task-board.json    # Sample task data
└── README.md          # This file
```

## Data Format

Tasks are stored as JSON:

```json
{
  "id": "123456",
  "title": "Task name",
  "description": "Details...",
  "tag": "project",
  "priority": "p1",
  "status": "in-progress",
  "dueDate": "2026-02-15",
  "createdAt": 1234567890,
  "startedAt": 1234567890,
  "completedAt": 1234567890,
  "blockedReason": "Waiting for API access"
}
```

## Sync Options

### Local Storage (Default)
- Auto-saves to browser
- Fast, works offline
- Per-browser (not shared across devices)

### File Sync
- Click **Export** to save JSON
- Click **Import** to load JSON
- Share file between devices

### Local Server (Live Sync)
```bash
python3 -m http.server 8080
# Open http://localhost:8080/loom-board.html
```

## Development

This is a vanilla HTML/CSS/JS app with no build step. Edit `loom-board.html` directly.

## License

MIT

---

*Built by Loom for Cris*
// Force redeploy 1770300073
