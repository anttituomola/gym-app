// Standard gym plate weights available (in kg)
export const STANDARD_PLATES = [20, 15, 10, 5, 2.5, 1.25];

// Default bar weight
export const BAR_WEIGHT = 20;

// Smallest plate increment (for rounding purposes)
export const SMALLEST_PLATE = 1.25;

/**
 * Calculate the closest achievable total weight given available plates
 * Returns a weight that can be made with the available plates + bar
 */
export function roundToAchievableWeight(targetWeight: number): number {
  // Minimum weight is just the bar
  if (targetWeight <= BAR_WEIGHT) {
    return BAR_WEIGHT;
  }
  
  // Calculate total plate weight needed
  const platesTotal = targetWeight - BAR_WEIGHT;
  
  // Calculate weight per side
  const perSide = platesTotal / 2;
  
  // Round per-side weight to nearest achievable with plates
  const achievablePerSide = roundToAchievablePlates(perSide);
  
  // Calculate final total weight
  return BAR_WEIGHT + (achievablePerSide * 2);
}

/**
 * Calculate the closest achievable per-side weight using available plates
 * Uses a greedy algorithm to find the best combination
 */
export function roundToAchievablePlates(targetPerSide: number): number {
  if (targetPerSide <= 0) {
    return 0;
  }
  
  // Round to nearest 1.25kg (smallest plate) for realistic gym scenarios
  const rounded = Math.round(targetPerSide / SMALLEST_PLATE) * SMALLEST_PLATE;
  
  // Check if we can actually make this weight with our plates
  let remaining = rounded;
  const sortedPlates = [...STANDARD_PLATES].sort((a, b) => b - a); // Descending
  
  for (const plate of sortedPlates) {
    while (remaining >= plate) {
      remaining -= plate;
    }
  }
  
  // If there's remaining weight, we need to round down to what's achievable
  if (remaining > 0.01) {
    // Find the largest achievable weight <= target
    return findLargestAchievableWeight(rounded);
  }
  
  return rounded;
}

/**
 * Find the largest achievable weight that is <= target
 */
function findLargestAchievableWeight(target: number): number {
  const sortedPlates = [...STANDARD_PLATES].sort((a, b) => b - a);
  let result = 0;
  let remaining = target;
  
  for (const plate of sortedPlates) {
    while (remaining >= plate) {
      result += plate;
      remaining -= plate;
    }
  }
  
  return result;
}

/**
 * Get the plate breakdown for a given per-side weight
 * Returns an array of plates needed on each side
 */
export function getPlateBreakdown(perSideWeight: number): number[] {
  if (perSideWeight <= 0) {
    return [];
  }
  
  const plates: number[] = [];
  const sortedPlates = [...STANDARD_PLATES].sort((a, b) => b - a);
  let remaining = perSideWeight;
  
  for (const plate of sortedPlates) {
    while (remaining >= plate - 0.01) { // Small tolerance for floating point
      plates.push(plate);
      remaining -= plate;
    }
  }
  
  return plates;
}

/**
 * Calculate plate weight per side for a total weight
 * Returns null if not a barbell exercise
 */
export function getPlateWeightPerSide(totalWeight: number, isBarbell: boolean): number | null {
  if (!isBarbell) {
    return null;
  }
  
  if (totalWeight <= BAR_WEIGHT) {
    return 0;
  }
  
  const platesTotal = totalWeight - BAR_WEIGHT;
  return platesTotal / 2;
}

/**
 * Check if a weight is achievable with available plates
 */
export function isAchievableWeight(weight: number): boolean {
  if (weight < BAR_WEIGHT) {
    return false;
  }
  
  if (weight === BAR_WEIGHT) {
    return true;
  }
  
  const perSide = (weight - BAR_WEIGHT) / 2;
  const achievable = roundToAchievablePlates(perSide);
  
  return Math.abs(perSide - achievable) < 0.01;
}

/**
 * Calculate the number of plates needed for a given per-side weight
 */
export function countPlates(perSideWeight: number): number {
  if (perSideWeight <= 0) return 0;
  
  const plates = getPlateBreakdown(perSideWeight);
  return plates.length;
}

/**
 * Check if weight B can be achieved by ONLY ADDING plates to weight A
 * (no plate removal required)
 */
export function canBuildByAddingOnly(fromWeight: number, toWeight: number): boolean {
  if (toWeight <= fromWeight) return false;
  
  const fromPerSide = Math.max(0, (fromWeight - BAR_WEIGHT) / 2);
  const toPerSide = (toWeight - BAR_WEIGHT) / 2;
  
  // Get plate breakdowns
  const fromPlates = getPlateBreakdown(fromPerSide);
  const toPlates = getPlateBreakdown(toPerSide);
  
  // Check if toPlates contains all fromPlates (can build by adding)
  const fromCopy = [...fromPlates];
  for (const plate of toPlates) {
    const index = fromCopy.indexOf(plate);
    if (index >= 0) {
      fromCopy.splice(index, 1); // Remove matched plate
    }
  }
  
  // If fromCopy is empty, all plates from 'from' are in 'to'
  return fromCopy.length === 0;
}

/**
 * Find the best achievable weight that:
 * 1. Can be built by only adding plates to currentWeight
 * 2. Is as close as possible to targetWeight
 * 3. Uses minimal plate count among valid options
 * 
 * @param currentWeight - Starting weight (what we have on the bar now)
 * @param targetWeight - Ideal target weight (usually percentage of work weight)
 * @param maxOvershoot - Maximum weight above target we'll accept (default 5kg total = 2.5kg per side)
 */
export function findOptimalWarmupWeight(
  currentWeight: number, 
  targetWeight: number,
  maxOvershoot: number = 5
): number {
  // If target is less than or equal to current, just return current
  if (targetWeight <= currentWeight) {
    return currentWeight;
  }
  
  const currentPerSide = Math.max(0, (currentWeight - BAR_WEIGHT) / 2);
  const targetPerSide = (targetWeight - BAR_WEIGHT) / 2;
  const maxPerSide = targetPerSide + (maxOvershoot / 2);
  
  // Generate all achievable weights between current and max
  const candidates: Array<{ weight: number; perSide: number; plateCount: number; overshoot: number }> = [];
  
  // Start from current and go up in 1.25kg increments (smallest plate)
  for (let perSide = currentPerSide; perSide <= maxPerSide; perSide += 1.25) {
    const achievablePerSide = roundToAchievablePlates(perSide);
    if (achievablePerSide <= currentPerSide) continue;
    
    const totalWeight = BAR_WEIGHT + (achievablePerSide * 2);
    
    // Skip if we've already seen this weight
    if (candidates.some(c => c.weight === totalWeight)) continue;
    
    // Check if we can build this by only adding plates
    if (!canBuildByAddingOnly(currentWeight, totalWeight)) continue;
    
    candidates.push({
      weight: totalWeight,
      perSide: achievablePerSide,
      plateCount: countPlates(achievablePerSide),
      overshoot: achievablePerSide - targetPerSide
    });
  }
  
  if (candidates.length === 0) {
    // Fallback: just return a simple increment if no optimal found
    const increment = Math.min(10, Math.ceil((targetWeight - currentWeight) / 10) * 10);
    return roundToAchievableWeight(currentWeight + increment);
  }
  
  // Sort candidates by:
  // 1. Closeness to target (prefer slight overshoot over undershoot if both are simple)
  // 2. Minimal plate count
  // 3. Minimal overshoot
  candidates.sort((a, b) => {
    // Prefer weights closer to target
    const aDiff = Math.abs(a.perSide - targetPerSide);
    const bDiff = Math.abs(b.perSide - targetPerSide);
    
    if (Math.abs(aDiff - bDiff) > 2.5) {
      return aDiff - bDiff;
    }
    
    // If similar distance, prefer fewer plates
    if (a.plateCount !== b.plateCount) {
      return a.plateCount - b.plateCount;
    }
    
    // If same plate count, prefer less overshoot
    return a.overshoot - b.overshoot;
  });
  
  return candidates[0].weight;
}

/**
 * Calculate plate difference between two weights
 * Returns plates to add (positive) or remove (negative)
 */
export function getPlateDifference(fromWeight: number, toWeight: number): { add: number[]; remove: number[] } {
  const fromPerSide = Math.max(0, (fromWeight - BAR_WEIGHT) / 2);
  const toPerSide = Math.max(0, (toWeight - BAR_WEIGHT) / 2);
  
  const fromPlates = getPlateBreakdown(fromPerSide);
  const toPlates = getPlateBreakdown(toPerSide);
  
  const fromCopy = [...fromPlates];
  const toCopy = [...toPlates];
  
  // Find common plates
  for (const plate of [...fromPlates]) {
    const index = toCopy.indexOf(plate);
    if (index >= 0) {
      fromCopy.splice(fromCopy.indexOf(plate), 1);
      toCopy.splice(index, 1);
    }
  }
  
  return {
    remove: fromCopy, // Plates in 'from' but not in 'to'
    add: toCopy       // Plates in 'to' but not in 'from'
  };
}

/**
 * Format plate changes for display
 * Shows what to add/remove in a human-readable format
 */
export function formatPlateChanges(fromWeight: number, toWeight: number): string {
  const diff = getPlateDifference(fromWeight, toWeight);
  
  if (diff.add.length === 0 && diff.remove.length === 0) {
    return 'No change';
  }
  
  const parts: string[] = [];
  
  if (diff.add.length > 0) {
    const addStr = diff.add.map(p => `+${p}`).join(', ');
    parts.push(`Add: ${addStr}`);
  }
  
  if (diff.remove.length > 0) {
    const removeStr = diff.remove.map(p => `-${p}`).join(', ');
    parts.push(`Remove: ${removeStr}`);
  }
  
  return parts.join(' | ');
}

/**
 * Get total plate count for a weight
 */
export function getTotalPlateCount(weight: number): number {
  if (weight <= BAR_WEIGHT) return 0;
  const perSide = (weight - BAR_WEIGHT) / 2;
  return countPlates(perSide) * 2; // Both sides
}
