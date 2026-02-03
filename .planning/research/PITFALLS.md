# Pitfalls Research: Convex Authentication & Assistant Integration

**Project:** Loom Board
**Researched:** 2026-02-02
**Focus:** Adding Convex (auth + database) and MCP assistant integration to existing vanilla JS app

## Summary

The primary risks when adding Convex to a vanilla JavaScript app center on three areas: (1) Convex Auth is React-first, requiring workarounds or alternative auth approaches for vanilla JS; (2) subscription management without React's lifecycle hooks requires manual cleanup to prevent memory leaks; and (3) MCP server integration exposes powerful capabilities that require careful permission scoping to avoid accidental data modifications or security vulnerabilities.

---

## Convex + Vanilla JS Pitfalls

### 1. Convex Auth Requires React

**Risk:** Convex Auth (`@convex-dev/auth`) is explicitly designed for React, Next.js, and React Native. It uses `ConvexAuthProvider` and React hooks. Attempting to use it directly in vanilla JS will fail.

**Warning signs:**
- Import errors when trying to use `@convex-dev/auth/react`
- `ConvexAuthProvider is not defined` errors
- Documentation only shows React examples

**Prevention:**
- Use **Better Auth with Convex** instead ([Better Auth Convex Integration](https://www.better-auth.com/docs/integrations/convex)) which supports vanilla JS
- Or implement **Custom JWT authentication** using `ConvexClient.setAuth()` with a third-party OAuth provider (Google Identity Services) and configure `auth.config.ts` with your custom JWT issuer
- Or serve the app through a thin React wrapper just for auth (adds complexity)

**Phase:** Authentication phase - must decide auth approach before implementation

### 2. Subscription Memory Leaks Without React Hooks

**Risk:** React's `useEffect` cleanup automatically handles subscription lifecycle. In vanilla JS, you must manually track and call `unsubscribe()` on every `onUpdate()` call, or subscriptions accumulate causing memory leaks and bandwidth waste.

**Warning signs:**
- Memory usage grows over time
- Network tab shows increasing WebSocket traffic
- Console shows duplicate update callbacks firing

**Prevention:**
```javascript
// Track all subscriptions
const subscriptions = [];

// When subscribing
const unsub = client.onUpdate(api.tasks.list, {}, callback);
subscriptions.push(unsub);

// On page unload or view change
subscriptions.forEach(fn => fn());
subscriptions.length = 0;
```

**Phase:** Database integration phase - establish cleanup patterns from the start

### 3. ConvexClient vs ConvexHttpClient Confusion

**Risk:** Two different clients exist: `ConvexClient` (WebSocket, reactive) and `ConvexHttpClient` (HTTP, one-shot). Using the wrong one breaks expected behavior.

**Warning signs:**
- `onUpdate` is undefined (using HttpClient)
- Real-time updates not working
- Connection errors mentioning WebSocket

**Prevention:**
```javascript
// For real-time subscriptions (what you likely want)
import { ConvexClient } from "convex/browser";

// For one-shot queries only (scripts, SSR)
import { ConvexHttpClient } from "convex/browser";
```

**Phase:** Project setup - choose correct client at initialization

### 4. Duplicate Subscription Callbacks

**Risk:** Unlike React's `useQuery` hook, `ConvexClient.onUpdate()` fires the callback immediately if data is already in memory, even on second subscription to the same query. This can cause duplicate UI updates.

**Warning signs:**
- UI renders twice on subscription setup
- State unexpectedly resets
- Performance issues from redundant rendering

**Prevention:**
- Check if you already have an active subscription before creating a new one
- Use a subscription manager pattern that deduplicates
- Consider using `getCurrentValue()` from the unsubscribe object for synchronous access

**Phase:** Database integration phase

---

## Convex Auth Pitfalls

### 5. Google OAuth Redirect URI Mismatch

**Risk:** Google OAuth returns "Error 400: redirect_uri_mismatch" when the configured redirect URI doesn't match exactly what Convex Auth expects.

**Warning signs:**
- OAuth popup/redirect fails immediately
- "Error 400: redirect_uri_mismatch" in browser
- OAuth works in dev but fails in production (or vice versa)

**Prevention:**
- In Google Cloud Console, set Authorized Redirect URI to: `{YOUR_CONVEX_HTTP_ACTIONS_URL}/api/auth/callback/google`
- Set Authorized JavaScript Origin to your app's domain (e.g., `http://localhost:3000` for dev)
- **Create separate OAuth apps for dev and production** - they cannot share the same configuration due to different domains

**Phase:** Authentication phase - verify OAuth setup before going live

### 6. Session Persistence After Page Refresh (Known Bug)

**Risk:** There's a [known issue](https://github.com/get-convex/convex-auth/issues/193) where user sessions don't persist after browser refresh with Google OAuth. The session appears valid but fails verification.

**Warning signs:**
- User logged in, refresh page, appears logged out
- Console shows "Invalid verification code" errors
- `authVerifiers` table missing expected records

**Prevention:**
- Monitor the GitHub issue for fixes
- Implement session check on page load that gracefully handles this case
- Consider storing auth state redundantly and re-authenticating if needed

**Phase:** Authentication phase - test thoroughly before launch

### 7. Environment Variable Mismatch Between Dev/Prod

**Risk:** OAuth credentials differ between development and production but it's easy to deploy with wrong credentials, breaking auth entirely.

**Warning signs:**
- Auth works locally, fails in production
- "Invalid client_id" or "client not found" errors
- Users redirect to wrong OAuth consent screen

**Prevention:**
```bash
# Set environment variables for EACH deployment
npx convex env set AUTH_GOOGLE_ID your_prod_client_id --prod
npx convex env set AUTH_GOOGLE_SECRET your_prod_client_secret --prod
```
- Use Convex dashboard to verify environment variables per deployment
- Document which credentials belong to which environment

**Phase:** Deployment phase - verify before each production deploy

### 8. getUserIdentity() Returns null Before Auth Ready

**Risk:** Calling `ctx.auth.getUserIdentity()` in queries returns `null` if the client hasn't finished authenticating, leading to access denied errors for legitimate users.

**Warning signs:**
- Intermittent "not authenticated" errors on page load
- Works after a moment, fails on fresh load
- Race condition between auth and first query

**Prevention:**
- In React: wrap components with `Authenticated` component
- In vanilla JS: wait for auth state before making authenticated queries
- Return loading state from queries when `getUserIdentity()` is null

**Phase:** Authentication phase - implement auth-ready checking pattern

---

## MCP + Convex Integration Pitfalls

### 9. Accidental Production Database Access

**Risk:** The Convex MCP server can access production deployments if the `--dangerously-enable-production-deployments` flag is used, allowing Claude Code to accidentally modify or delete production data.

**Warning signs:**
- MCP responses show production data
- Claude Code suggests running mutations against production
- Data disappears unexpectedly

**Prevention:**
- **Never use `--dangerously-enable-production-deployments` flag**
- Default MCP configuration targets development deployment only
- Add to MCP config: `claude mcp add-json convex '{"type":"stdio","command":"npx","args":["convex","mcp","start"]}'` (no prod flag)
- Verify deployment target before any MCP operation

**Phase:** MCP integration phase - configure safely from the start

### 10. MCP Environment Variable Exposure

**Risk:** The Convex MCP server exposes `envList` and `envGet` tools that can read ALL environment variables, including secrets like `AUTH_GOOGLE_SECRET`.

**Warning signs:**
- Claude Code outputs your OAuth secrets
- Environment variables appear in conversation history
- Secrets visible in logs

**Prevention:**
- Use `--disable-tools envGet,envSet,envRemove` flag to disable sensitive tools
- Or accept that Claude Code will see these values and ensure your conversation history is secure
- Never share Claude Code sessions that might contain secrets

**Phase:** MCP integration phase - disable sensitive tools

### 11. MCP Query Errors Break Claude Code Flow

**Risk:** If `runOneoffQuery` encounters a runtime error (schema mismatch, type error), it returns an error that can confuse Claude Code's reasoning about your data.

**Warning signs:**
- Claude Code makes incorrect assumptions about data structure
- Queries return errors that get interpreted as "no data"
- Repeated failed attempts at the same query

**Prevention:**
- Ensure schema is deployed and validated before MCP use
- Use strict schema validation (`schemaValidation: true`)
- When Claude Code encounters query errors, check Convex dashboard logs

**Phase:** MCP integration phase - validate schema before enabling MCP

### 12. No Authentication Context in MCP Queries

**Risk:** MCP `runOneoffQuery` runs in a sandboxed environment without user authentication context. You cannot test user-specific queries or access control through MCP.

**Warning signs:**
- `ctx.auth.getUserIdentity()` returns null in MCP queries
- Cannot test "get my tasks" type queries
- Access control logic cannot be verified via MCP

**Prevention:**
- Use MCP for admin/debug queries only
- Test user-specific queries through the actual app
- Create separate admin query functions that don't require auth for debugging

**Phase:** MCP integration phase - understand MCP limitations

---

## Data Migration Pitfalls

### 13. localStorage Data Structure Mismatch

**Risk:** The current app stores tasks in localStorage with a specific structure. Migrating to Convex requires schema design that may not match 1:1, causing data loss or corruption.

**Warning signs:**
- Some task fields don't appear after migration
- Date fields become strings or vice versa
- Nested objects flatten unexpectedly

**Prevention:**
- Audit current localStorage structure completely:
```javascript
// Current structure from code analysis
{
  tasks: [{ id, title, description, tag, dueDate, priority,
            status, createdAt, startedAt, completedAt,
            blockedReason, archived }],
  history: [{ timestamp, time, action, task }]
}
```
- Design Convex schema to match or explicitly document transformations
- Write migration script that validates data before and after

**Phase:** Database design phase - schema must match data

### 14. Timestamp Format Inconsistencies

**Risk:** The current app uses JavaScript timestamps (`Date.now()`) for `createdAt`, `startedAt`, `completedAt`. Convex can store these as numbers, but date handling in queries requires care.

**Warning signs:**
- Date comparisons return unexpected results
- "Invalid date" errors
- Sorting by date doesn't work correctly

**Prevention:**
- Decide on timestamp format (number ms vs ISO string) and use consistently
- Don't use `Date.now()` in queries (breaks caching)
- Store timestamps as numbers, format in UI layer only

**Phase:** Database design phase

### 15. Missing Migration Rollback Plan

**Risk:** Once users' data is migrated from localStorage to Convex, there's no automatic way back. If migration has bugs, users lose data.

**Warning signs:**
- Users report missing tasks
- Some users have data, others don't
- No way to recover from failed migration

**Prevention:**
- Keep localStorage data for a transition period (don't delete immediately)
- Implement "re-import from localStorage" feature
- Run migration in batches with verification
- Back up Convex data before any schema changes

**Phase:** Migration phase - plan rollback before migration

### 16. Dual-Write Transition Period Complexity

**Risk:** During migration, you may want to write to both localStorage (fallback) and Convex (primary). This creates consistency issues if one write fails.

**Warning signs:**
- Data appears in localStorage but not Convex (or vice versa)
- Duplicate tasks appearing
- Different data on different devices

**Prevention:**
- Prefer clean cutover: read from localStorage, write only to Convex
- One-time migration script that moves all data
- After migration, remove localStorage code entirely
- Don't try to keep both in sync long-term

**Phase:** Migration phase

---

## Common Mistakes to Avoid

1. **DON'T** try to use Convex Auth React components in vanilla JS - they won't work
2. **DON'T** enable production MCP access during development
3. **DON'T** forget to unsubscribe from Convex queries when views change
4. **DON'T** use `Date.now()` inside Convex query functions
5. **DON'T** assume OAuth credentials work across dev/prod environments
6. **DON'T** delete localStorage data until migration is verified
7. **DON'T** call authenticated queries before auth state is ready
8. **DON'T** expose MCP environment variable tools in shared sessions
9. **DON'T** skip argument validation on public Convex functions
10. **DON'T** `.collect()` unbounded queries - use pagination or limits

---

## Phase-Specific Warnings Summary

| Phase | Likely Pitfall | Priority |
|-------|---------------|----------|
| Project Setup | Wrong client choice (ConvexClient vs HttpClient) | HIGH |
| Auth Implementation | Convex Auth doesn't support vanilla JS | CRITICAL |
| Auth Implementation | OAuth redirect URI mismatch | HIGH |
| Auth Implementation | Session persistence bug with Google OAuth | MEDIUM |
| Database Design | Schema doesn't match localStorage structure | HIGH |
| Database Integration | Memory leaks from unmanaged subscriptions | HIGH |
| Migration | No rollback plan for failed migration | HIGH |
| MCP Integration | Accidental production database access | CRITICAL |
| MCP Integration | Environment variable exposure | MEDIUM |
| Deployment | Dev/prod environment variable mismatch | HIGH |

---

## Sources

- [Convex JavaScript Client Documentation](https://docs.convex.dev/client/javascript)
- [Convex Auth Setup](https://labs.convex.dev/auth)
- [Better Auth Convex Integration](https://www.better-auth.com/docs/integrations/convex)
- [Convex MCP Server Documentation](https://docs.convex.dev/ai/convex-mcp-server)
- [Google OAuth Configuration for Convex](https://labs.convex.dev/auth/config/oauth/google)
- [Convex Auth Session Persistence Issue #193](https://github.com/get-convex/convex-auth/issues/193)
- [Convex Authentication Debugging](https://docs.convex.dev/auth/debug)
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/)
- [MCP Security Best Practices](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices)
- [Convex Migrations](https://stack.convex.dev/intro-to-migrations)
