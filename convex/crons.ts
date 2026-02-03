import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup daily at 2 AM UTC
// Per CONTEXT.md: retain history for 90 days
crons.daily(
  "cleanup old activity history",
  { hourUTC: 2, minuteUTC: 0 },
  internal.activityHistory.cleanupOldRecords
);

export default crons;
