import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { 
  EquipmentCategory,
  EquipmentDeduplicationResult,
  FullDeduplicationResult,
} from "../src/lib/types/equipment";

/**
 * Equipment management
 * - AI-powered photo recognition
 * - Deduplication against existing equipment
 * - Storage in Convex with images
 */

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all equipment for the current user
 */
export const getUserEquipments = query({
  handler: async (ctx): Promise<any[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    const equipments = await ctx.db
      .query("equipments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    
    return equipments;
  },
});

/**
 * Check if equipment already exists (for deduplication)
 * Returns the most similar existing equipment if found
 */
export const checkEquipmentDeduplication = query({
  args: {
    normalizedName: v.string(),
  },
  handler: async (ctx, args): Promise<EquipmentDeduplicationResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { status: "new", similarityScore: 0 };
    }
    
    // Get all user's equipment
    const userEquipments = await ctx.db
      .query("equipments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    // Find the most similar
    let bestMatch: { equipment: any; score: number } | null = null;
    
    for (const equipment of userEquipments) {
      const score = calculateSimilarity(
        args.normalizedName,
        equipment.normalizedName
      );
      
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { equipment, score };
      }
    }
    
    // Determine status based on similarity
    if (!bestMatch || bestMatch.score < 0.75) {
      return { status: "new", similarityScore: 0 };
    }
    
    if (bestMatch.score >= 0.95) {
      return {
        status: "exact_match",
        existingEquipment: bestMatch.equipment,
        similarityScore: bestMatch.score,
      };
    }
    
    return {
      status: "similar",
      existingEquipment: bestMatch.equipment,
      similarityScore: bestMatch.score,
      suggestedName: bestMatch.equipment.name,
    };
  },
});

/**
 * Check multiple potential exercise names for deduplication
 * Returns which ones already exist (static or custom)
 */
export const checkExerciseDeduplication = query({
  args: {
    normalizedNames: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<Record<string, { exists: boolean; exerciseId?: string }>> => {
    // This will be extended in Phase 2 when we add customExercises table
    // For now, just check against static EXERCISES list by importing from client
    // We'll return all as "new" since we can't access client code from server
    
    const result: Record<string, { exists: boolean; exerciseId?: string }> = {};
    for (const name of args.normalizedNames) {
      result[name] = { exists: false };
    }
    
    return result;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Save new equipment with images
 */
export const saveEquipment = mutation({
  args: {
    name: v.string(),
    normalizedName: v.string(),
    category: v.union(
      v.literal("barbell"),
      v.literal("dumbbell"),
      v.literal("machine"),
      v.literal("cable"),
      v.literal("kettlebell"),
      v.literal("cardio"),
      v.literal("bodyweight"),
      v.literal("other")
    ),
    description: v.optional(v.string()),
    imageStorageIds: v.array(v.id("_storage")),
    recognitionConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    // Check for exact duplicate
    const existing = await ctx.db
      .query("equipments")
      .withIndex("by_user_normalized", (q) => 
        q.eq("userId", userId).eq("normalizedName", args.normalizedName)
      )
      .first();
    
    if (existing) {
      throw new Error(`Equipment "${args.name}" already exists`);
    }
    
    // Create the equipment
    const equipmentId = await ctx.db.insert("equipments", {
      userId,
      name: args.name,
      normalizedName: args.normalizedName,
      category: args.category,
      description: args.description,
      imageStorageIds: args.imageStorageIds,
      isCustom: true,
      recognitionConfidence: args.recognitionConfidence,
      createdAt: Date.now(),
    });
    
    // Also add to user's gymEquipment list in userProfiles
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (profile) {
      const currentEquipment = profile.gymEquipment || [];
      if (!currentEquipment.includes(args.normalizedName)) {
        await ctx.db.patch(profile._id, {
          gymEquipment: [...currentEquipment, args.normalizedName],
        });
      }
    }
    
    return equipmentId;
  },
});

/**
 * Delete equipment and its images
 */
export const deleteEquipment = mutation({
  args: {
    equipmentId: v.id("equipments"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const equipment = await ctx.db.get(args.equipmentId);
    if (!equipment || equipment.userId !== userId) {
      throw new Error("Equipment not found or access denied");
    }
    
    // Delete images from storage
    if (equipment.imageStorageIds) {
      for (const storageId of equipment.imageStorageIds) {
        await ctx.storage.delete(storageId);
      }
    }
    
    // Remove from user's gymEquipment list
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    if (profile) {
      const currentEquipment = profile.gymEquipment || [];
      await ctx.db.patch(profile._id, {
        gymEquipment: currentEquipment.filter(e => e !== equipment.normalizedName),
      });
    }
    
    // Delete the equipment
    await ctx.db.delete(args.equipmentId);
  },
});

// ============================================================================
// Actions
// ============================================================================

/**
 * Store images in Convex storage and return IDs
 * This is an action because it uses ctx.storage
 */
export const storeEquipmentImages = action({
  args: {
    images: v.array(v.object({
      base64: v.string(),
      mimeType: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const storageIds: string[] = [];
    
    for (const image of args.images) {
      // Convert base64 to Blob for Convex storage
      const binaryString = atob(image.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create Blob from Uint8Array
      const blob = new Blob([bytes], { type: image.mimeType });
      
      // Store in Convex storage
      const storageId = await ctx.storage.store(blob);
      
      storageIds.push(storageId);
    }
    
    return storageIds;
  },
});

/**
 * Get signed URLs for equipment images
 */
export const getEquipmentImageUrls = query({
  args: {
    equipmentId: v.id("equipments"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    const equipment = await ctx.db.get(args.equipmentId);
    if (!equipment || equipment.userId !== userId) return [];
    
    if (!equipment.imageStorageIds) return [];
    
    const urls: string[] = [];
    for (const storageId of equipment.imageStorageIds) {
      const url = await ctx.storage.getUrl(storageId);
      if (url) urls.push(url);
    }
    
    return urls;
  },
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate similarity between two normalized names
 * Returns 0-1 score (1 = exact match)
 */
function calculateSimilarity(name1: string, name2: string): number {
  if (name1 === name2) return 1;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  const len1 = name1.length;
  const len2 = name2.length;
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = name1[i - 1] === name2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1;
  
  return 1 - matrix[len1][len2] / maxLen;
}
