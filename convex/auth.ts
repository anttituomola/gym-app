import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Use Convex Auth for password-based auth only
// Google OAuth is handled separately via custom implementation
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
