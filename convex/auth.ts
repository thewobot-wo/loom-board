import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google],
  session: {
    totalDurationMs: 30 * 24 * 60 * 60 * 1000, // 30 days per CONTEXT.md
  },
});
