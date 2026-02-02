# Loom Board

A lightweight, self-hosted Kanban board for tracking tasks with AI assistants.

## Features

- **4 columns:** Backlog → In Progress → Blocked → Done
- **Drag & drop** to move tasks between columns
- **Double-click** to edit tasks
- **Real-time status banner** showing current work
- **Activity history** tracking
- **Import/Export JSON** for backup and sharing
- **File sync** with JSON backend

## Quick Start

1. Open `loom-board.html` in any browser
2. Click **"Import JSON"** and select `task-board.json` (or start fresh)
3. Add tasks, drag to prioritize, track progress

## File Structure

- `loom-board.html` — The board UI (single file, no dependencies)
- `task-board.json` — Task data in JSON format
- `README.md` — This file

## Sync Between Sessions

The board auto-saves to browser localStorage. For multi-device sync:
- Export JSON from one instance
- Import JSON to another

Or serve via a local web server for live file sync:

```bash
python3 -m http.server 8080
# Open http://localhost:8080/loom-board.html
```

## Task Schema

```json
{
  "id": "unique-id",
  "title": "Task name",
  "tag": "project|research|bug|feature|maintenance|cruise",
  "status": "backlog|in-progress|blocked|done",
  "createdAt": 1234567890,
  "startedAt": 1234567890,
  "completedAt": 1234567890,
  "blockedReason": "Why blocked (if status is blocked)"
}
```

## License

MIT
