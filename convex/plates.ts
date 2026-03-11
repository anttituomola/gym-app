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
