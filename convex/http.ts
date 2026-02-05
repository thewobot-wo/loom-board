import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  archiveTask,
  searchTasks,
  getBoardSummary,
  getActiveTask,
  setActiveTask,
  clearActiveTask,
} from "./mcpApi";

const http = httpRouter();

// Auth routes (OAuth callbacks, etc.)
auth.addHttpRoutes(http);

// --- MCP API Routes ---

// CORS preflight handler for all MCP routes
const corsPreflightHandler = httpAction(async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
});

// Task listing and retrieval
http.route({ path: "/mcp/tasks", method: "GET", handler: listTasks });
http.route({ path: "/mcp/tasks", method: "OPTIONS", handler: corsPreflightHandler });

http.route({ path: "/mcp/tasks/get", method: "GET", handler: getTask });
http.route({ path: "/mcp/tasks/get", method: "OPTIONS", handler: corsPreflightHandler });

// Task mutations
http.route({ path: "/mcp/tasks/create", method: "POST", handler: createTask });
http.route({ path: "/mcp/tasks/create", method: "OPTIONS", handler: corsPreflightHandler });

http.route({ path: "/mcp/tasks/update", method: "POST", handler: updateTask });
http.route({ path: "/mcp/tasks/update", method: "OPTIONS", handler: corsPreflightHandler });

http.route({ path: "/mcp/tasks/move", method: "POST", handler: moveTask });
http.route({ path: "/mcp/tasks/move", method: "OPTIONS", handler: corsPreflightHandler });

http.route({ path: "/mcp/tasks/delete", method: "POST", handler: deleteTask });
http.route({ path: "/mcp/tasks/delete", method: "OPTIONS", handler: corsPreflightHandler });

http.route({ path: "/mcp/tasks/archive", method: "POST", handler: archiveTask });
http.route({ path: "/mcp/tasks/archive", method: "OPTIONS", handler: corsPreflightHandler });

// Search and summary
http.route({ path: "/mcp/tasks/search", method: "POST", handler: searchTasks });
http.route({ path: "/mcp/tasks/search", method: "OPTIONS", handler: corsPreflightHandler });

http.route({ path: "/mcp/board/summary", method: "POST", handler: getBoardSummary });
http.route({ path: "/mcp/board/summary", method: "OPTIONS", handler: corsPreflightHandler });

// Active task endpoints
http.route({ path: "/mcp/tasks/active", method: "GET", handler: getActiveTask });
http.route({ path: "/mcp/tasks/active", method: "OPTIONS", handler: corsPreflightHandler });

http.route({ path: "/mcp/tasks/active", method: "POST", handler: setActiveTask });
http.route({ path: "/mcp/tasks/active/clear", method: "POST", handler: clearActiveTask });
http.route({ path: "/mcp/tasks/active/clear", method: "OPTIONS", handler: corsPreflightHandler });

export default http;
