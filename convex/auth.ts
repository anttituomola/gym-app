import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";

// 1 year in milliseconds - keep users logged in by default
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // Configure longer sessions to keep users logged in
  session: {
    // Sessions last 1 year by default (users stay logged in)
    inactiveDurationMs: ONE_YEAR_MS,
  },
});
