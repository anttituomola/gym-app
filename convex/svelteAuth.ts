import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Generate secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Simple hash using SHA-256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Register new user
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      throw new Error("User already exists");
    }
    
    // Hash password
    const passwordHash = await hashPassword(args.password);
    
    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
    });
    
    // Store password hash in a separate table
    await ctx.db.insert("authSecrets", {
      userId,
      passwordHash,
    });
    
    // Generate auth token
    const token = generateToken();
    const expiresAt = Date.now() + TOKEN_EXPIRY;
    
    await ctx.db.insert("authTokens", {
      userId,
      token,
      expiresAt,
    });
    
    return { token, userId };
  },
});

// Login
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    
    if (!user) {
      throw new Error("Invalid credentials");
    }
    
    // Find password hash
    const secret = await ctx.db
      .query("authSecrets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    
    if (!secret) {
      throw new Error("Invalid credentials");
    }
    
    // Verify password
    const valid = await verifyPassword(args.password, secret.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }
    
    // Generate auth token
    const token = generateToken();
    const expiresAt = Date.now() + TOKEN_EXPIRY;
    
    // Delete old tokens
    const oldTokens = await ctx.db
      .query("authTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    for (const t of oldTokens) {
      await ctx.db.delete(t._id);
    }
    
    await ctx.db.insert("authTokens", {
      userId: user._id,
      token,
      expiresAt,
    });
    
    return { token, userId: user._id };
  },
});

// Verify token
export const verifyToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenDoc = await ctx.db
      .query("authTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    
    if (!tokenDoc || tokenDoc.expiresAt < Date.now()) {
      return null;
    }
    
    const user = await ctx.db.get(tokenDoc.userId);
    return user;
  },
});

// Logout
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenDoc = await ctx.db
      .query("authTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    
    if (tokenDoc) {
      await ctx.db.delete(tokenDoc._id);
    }
  },
});

// Get current user from auth context
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
