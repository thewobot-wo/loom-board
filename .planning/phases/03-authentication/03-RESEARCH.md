# Phase 3: Authentication - Research

**Researched:** 2026-02-02
**Domain:** Convex Auth with Google OAuth, React authentication patterns
**Confidence:** HIGH

## Summary

This research covers implementing Google OAuth authentication using Convex Auth (`@convex-dev/auth`), the official authentication library for Convex applications. The library integrates directly into the Convex backend, providing session management, OAuth handling, and React hooks for authentication state.

The standard approach is to use `@convex-dev/auth` with `@auth/core` for provider configurations. Convex Auth automatically creates authentication tables (`users`, `authSessions`, `authAccounts`, etc.), provides React hooks (`useConvexAuth`, `useAuthActions`), and components (`Authenticated`, `Unauthenticated`, `AuthLoading`) for conditional rendering. Session persistence defaults to 30 days and uses localStorage for token storage.

The implementation requires: (1) installing packages and running setup CLI, (2) configuring Google Cloud OAuth credentials, (3) setting environment variables in Convex, (4) creating auth files in the convex directory, (5) wrapping the app with `ConvexAuthProvider`, and (6) updating all Convex functions to validate authentication.

**Primary recommendation:** Use `@convex-dev/auth@0.0.90` with `@auth/core@~0.37.3` and follow the official manual setup guide for Google OAuth integration.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @convex-dev/auth | 0.0.90 | Authentication library for Convex | Official Convex auth solution, direct backend integration |
| @auth/core | ~0.37.3 | OAuth provider implementations | Required peer dependency, provides Google OAuth provider |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| convex | 1.31.7 (existing) | Backend + React client | Already installed, provides ConvexReactClient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @convex-dev/auth | Better Auth | More features but requires separate integration |
| Google OAuth only | Multiple providers | Google-only is simpler per prior decision |

**Installation:**
```bash
npm install @convex-dev/auth @auth/core@~0.37.3
npx @convex-dev/auth  # Interactive setup CLI
```

## Architecture Patterns

### Recommended Project Structure
```
convex/
├── auth.ts              # convexAuth() configuration with Google provider
├── auth.config.ts       # Auth provider domain configuration
├── http.ts              # HTTP routes including auth endpoints
├── schema.ts            # Spread authTables + existing tables
└── tasks.ts             # Updated with auth validation

src/
├── main.tsx             # ConvexAuthProvider wrapping app
├── App.tsx              # Authenticated/Unauthenticated routing
├── components/
│   ├── Auth/
│   │   ├── LoginScreen.tsx    # Centered login with Google button
│   │   └── UserMenu.tsx       # Avatar + name in header
│   └── Header/
│       └── Header.tsx         # Updated with user identity display
```

### Pattern 1: Auth Provider Wrapper
**What:** Replace ConvexProvider with ConvexAuthProvider in main.tsx
**When to use:** Always, for any Convex Auth integration
**Example:**
```typescript
// Source: https://labs.convex.dev/auth/setup
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </StrictMode>
);
```

### Pattern 2: Conditional Rendering with Auth Components
**What:** Use Authenticated/Unauthenticated/AuthLoading for route protection
**When to use:** Main App component to gate access
**Example:**
```typescript
// Source: https://docs.convex.dev/auth/convex-auth
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

function App() {
  return (
    <>
      <AuthLoading>
        <LoadingSpinner />
      </AuthLoading>
      <Unauthenticated>
        <LoginScreen />
      </Unauthenticated>
      <Authenticated>
        <MainApp />
      </Authenticated>
    </>
  );
}
```

### Pattern 3: Protected Convex Functions
**What:** Validate auth in every query/mutation before accessing data
**When to use:** Every Convex function that accesses user data
**Example:**
```typescript
// Source: https://labs.convex.dev/auth/authz
import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";

export const listTasks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    // Filter tasks by userId
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();
  },
});
```

### Pattern 4: Google Sign-In Button
**What:** Trigger OAuth flow via useAuthActions hook
**When to use:** Login screen
**Example:**
```typescript
// Source: https://labs.convex.dev/auth/config/oauth/google
import { useAuthActions } from "@convex-dev/auth/react";

export function GoogleSignInButton() {
  const { signIn } = useAuthActions();

  return (
    <button onClick={() => void signIn("google")}>
      Sign in with Google
    </button>
  );
}
```

### Pattern 5: Getting User Profile Data
**What:** Query user document for name/avatar from Google profile
**When to use:** Header user display, anywhere user info needed
**Example:**
```typescript
// Source: https://labs.convex.dev/auth/authz
import { getAuthUserId } from "@convex-dev/auth/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});
```
The user document contains `name`, `email`, and `image` fields from Google OAuth profile.

### Anti-Patterns to Avoid
- **Checking auth state with useSession/getSession:** Use `useConvexAuth()` or `<Authenticated>` from convex/react, not auth library directly. Convex must validate tokens separately.
- **Calling protected queries outside Authenticated:** Will throw errors. Always wrap in `<Authenticated>` or check `isAuthenticated` first.
- **Storing tokens manually:** Let ConvexAuthProvider handle token storage in localStorage.
- **Using dangerouslySetInnerHTML:** XSS vulnerability that could expose auth tokens.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow | Custom redirect handling | `signIn("google")` from useAuthActions | PKCE, state verification, token exchange handled |
| Session management | Cookie/token logic | Convex Auth session system | Refresh tokens, expiry, multi-device handled |
| Auth state in React | Context + useEffect | `<Authenticated>`, `useConvexAuth()` | Syncs with Convex client state properly |
| User profile storage | Separate user table | Built-in `users` table from authTables | Pre-indexed, linked to sessions |
| JWT validation | Manual token parsing | `getAuthUserId(ctx)` | Validates signature, expiry, claims |
| Rate limiting login | Custom counter | Built-in `maxFailedAttempsPerHour` | Per-hour limits, automatic reset |

**Key insight:** Convex Auth handles the entire OAuth + session lifecycle. Custom solutions miss edge cases like refresh token rotation, session invalidation across devices, and PKCE verification.

## Common Pitfalls

### Pitfall 1: @auth/core Version Mismatch
**What goes wrong:** TypeScript errors on provider configuration, type incompatibilities
**Why it happens:** @convex-dev/auth has strict peer dependency on specific @auth/core versions
**How to avoid:** Pin @auth/core to ~0.37.3 when using @convex-dev/auth@0.0.90
**Warning signs:** Type errors on `Google` import or provider array

### Pitfall 2: Missing Environment Variables
**What goes wrong:** OAuth redirect fails, "missing credentials" errors
**Why it happens:** Google OAuth requires 4 env vars: SITE_URL, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, JWT keys
**How to avoid:** Run `npx @convex-dev/auth` CLI which generates JWT keys; manually set Google credentials
**Warning signs:** "Invalid client" or redirect_uri_mismatch errors from Google

### Pitfall 3: Wrong Callback URL in Google Cloud
**What goes wrong:** OAuth flow fails after Google login
**Why it happens:** Redirect URI must be HTTP Actions URL (ends in .site), not deployment URL (.cloud)
**How to avoid:** Use format: `https://[deployment-name].convex.site/api/auth/callback/google`
**Warning signs:** "redirect_uri_mismatch" error from Google

### Pitfall 4: Querying Protected Data Before Auth Ready
**What goes wrong:** "Not authenticated" errors on page load
**Why it happens:** Convex must validate JWT before queries work; takes a moment after page load
**How to avoid:** Wrap data-fetching components inside `<Authenticated>` or check `isAuthenticated` from `useConvexAuth()`
**Warning signs:** Errors on initial render that disappear on retry

### Pitfall 5: Schema Migration Without authTables
**What goes wrong:** Authentication fails silently or throws "table not found"
**Why it happens:** Convex Auth requires specific tables: users, authSessions, authAccounts, authRefreshTokens, authVerificationCodes, authVerifiers, authRateLimits
**How to avoid:** Spread `...authTables` into schema.ts
**Warning signs:** "Table 'users' not found" or "Table 'authSessions' not found"

### Pitfall 6: Forgetting to Add userId to Tasks
**What goes wrong:** All users see all tasks (no data isolation)
**Why it happens:** Tasks table needs userId field + index; queries need to filter by userId
**How to avoid:** Add `userId: v.id("users")` to tasks schema, add `by_user` index, filter in queries
**Warning signs:** Data appears identical across different logged-in users

## Code Examples

Verified patterns from official sources:

### convex/auth.ts - Google Provider Setup
```typescript
// Source: https://labs.convex.dev/auth/config/oauth/google
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  session: {
    // 30 days per user decision in CONTEXT.md
    totalDurationMs: 1000 * 60 * 60 * 24 * 30,
    inactiveDurationMs: 1000 * 60 * 60 * 24 * 30,
  },
});
```

### convex/auth.config.ts
```typescript
// Source: https://labs.convex.dev/auth/setup/manual
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

### convex/http.ts - Auth Routes
```typescript
// Source: https://labs.convex.dev/auth/setup/manual
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
```

### convex/schema.ts - With Auth Tables
```typescript
// Source: https://labs.convex.dev/auth/setup
import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  tasks: defineTable({
    // existing fields...
    userId: v.id("users"),  // NEW: link to auth user
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status", "order"]),
  // ... rest of schema
});
```

### Sign Out Button
```typescript
// Source: https://labs.convex.dev/auth/api_reference/react
import { useAuthActions } from "@convex-dev/auth/react";

export function SignOutButton() {
  const { signOut } = useAuthActions();

  return (
    <button onClick={() => void signOut()}>
      Sign out
    </button>
  );
}
```

### useConvexAuth Hook Usage
```typescript
// Source: https://docs.convex.dev/auth/convex-auth
import { useConvexAuth } from "convex/react";

function AuthStatus() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) return <Spinner />;
  return isAuthenticated ? <LoggedInUI /> : <LoginScreen />;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Clerk/Auth0 external | @convex-dev/auth built-in | 2024 | No external service, direct DB integration |
| Manual JWT handling | convexAuth() helpers | 2024 | Automatic refresh, session management |
| @auth/core 0.34.x | @auth/core ~0.37.3 | 2025 | Type fixes, new features |

**Deprecated/outdated:**
- Using Better Auth with Convex: Works but not officially supported by Convex team
- Manual cookie-based sessions: Replaced by automatic token storage in ConvexAuthProvider

## Open Questions

Things that couldn't be fully resolved:

1. **Multi-tab session sync behavior**
   - What we know: Convex Auth uses localStorage by default; Convex realtime syncs data across tabs automatically
   - What's unclear: Whether sign-out in one tab immediately reflects in others without BroadcastChannel
   - Recommendation: Test during implementation. Convex realtime may handle this, but explicit BroadcastChannel for logout is safer

2. **Exact user profile fields from Google**
   - What we know: Default stores `name`, `email`, `image` in users table
   - What's unclear: Exact field names/types in Google's profile object
   - Recommendation: Check authAccounts table after first login; avatar URL is likely in `image` field

## Sources

### Primary (HIGH confidence)
- https://labs.convex.dev/auth/setup/manual - Complete manual setup guide
- https://labs.convex.dev/auth/config/oauth/google - Google OAuth configuration
- https://labs.convex.dev/auth/api_reference/server - Server API (session config, getAuthUserId)
- https://labs.convex.dev/auth/api_reference/react - React hooks and components
- https://labs.convex.dev/auth/authz - Authorization patterns
- https://github.com/get-convex/convex-auth/blob/main/CHANGELOG.md - Version history

### Secondary (MEDIUM confidence)
- https://docs.convex.dev/auth/convex-auth - Convex official docs on auth
- https://stack.convex.dev/convex-auth - Convex blog introduction

### Tertiary (LOW confidence)
- Community discussions on session sync behavior - needs validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official docs, specific versions verified in changelog
- Architecture: HIGH - Patterns from official setup guides and API docs
- Pitfalls: HIGH - Documented in official guides and changelog
- Session config: HIGH - Explicit API reference for totalDurationMs/inactiveDurationMs

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable library with regular minor updates)
