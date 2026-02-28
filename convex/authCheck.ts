import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

// Base64URL decode helper
function base64UrlDecode(str: string): string {
  // Add padding if needed
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  // Use atob for base64 decoding
  try {
    return atob(base64);
  } catch {
    throw new Error('Invalid base64');
  }
}

// Verify a JWT token from @convex-dev/auth
export const verifyJwtToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // The JWT token format from @convex-dev/auth is:
    // header.payload.signature
    // The payload contains: sub (userId|sessionId), iat, iss, aud, exp
    try {
      const parts = args.token.split('.');
      if (parts.length !== 3) return null;
      
      // Decode the payload (base64url)
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      
      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return null; // Token expired
      }
      
      // Extract userId from sub (format: userId|sessionId)
      const sub = payload.sub as string;
      const userId = sub.split('|')[0];
      
      if (!userId) return null;
      
      // Get user from database
      const user = await ctx.db.get(userId as any);
      return user;
    } catch (e) {
      return null;
    }
  },
});
