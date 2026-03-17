import { describe, it, expect } from 'vitest';
import {
  STANDARD_PLATES,
  BAR_WEIGHT,
  SMALLEST_PLATE,
  roundToAchievableWeight,
  roundToAchievablePlates,
  getPlateBreakdown,
  getPlateWeightPerSide,
  isAchievableWeight,
  countPlates,
  canBuildByAddingOnly,
  findOptimalWarmupWeight,
  getPlateDifference,
  formatPlateChanges
} from '../plates';

describe('Plate Calculator', () => {
  describe('Constants', () => {
    it('should have standard plates defined', () => {
      expect(STANDARD_PLATES).toEqual([20, 15, 10, 5, 2.5, 1.25]);
    });

    it('should have bar weight of 20kg', () => {
      expect(BAR_WEIGHT).toBe(20);
    });

    it('should have smallest plate of 1.25kg', () => {
      expect(SMALLEST_PLATE).toBe(1.25);
    });
  });

  describe('roundToAchievableWeight', () => {
    it('should return bar weight for weights <= bar weight', () => {
      expect(roundToAchievableWeight(15)).toBe(20);
      expect(roundToAchievableWeight(20)).toBe(20);
    });

    it('should round to achievable weights', () => {
      // 60kg = 20kg bar + 20kg per side (20 plate)
      expect(roundToAchievableWeight(60)).toBe(60);
      
      // 80kg = 20kg bar + 30kg per side (20+10)
      expect(roundToAchievableWeight(80)).toBe(80);
      
      // 100kg = 20kg bar + 40kg per side (20+20)
      expect(roundToAchievableWeight(100)).toBe(100);
    });

    it('should round to nearest achievable weight', () => {
      // 61kg: 61 - 20 = 41 / 2 = 20.5 per side
      // 20.5 rounded to nearest 1.25 = 20 (since 20.5 is exactly halfway, rounds down)
      // = 60kg total
      expect(roundToAchievableWeight(61)).toBe(60);
      
      // 63kg: 63 - 20 = 43 / 2 = 21.5 per side
      // 21.5 rounded to nearest 1.25 = 21.25 (closer than 22.5)
      // But 21.25 = 20 + 1.25 IS achievable
      // = 62.5kg total
      expect(roundToAchievableWeight(63)).toBe(62.5);
      
      // 64kg: 64 - 20 = 44 / 2 = 22 per side
      // 22 rounded to nearest 1.25 = 22.5 (since 22 is closer to 21.25? No wait...)
      // 22 / 1.25 = 17.6, rounds to 18, 18 * 1.25 = 22.5
      // 22.5 = 20 + 2.5 IS achievable
      // = 65kg total
      expect(roundToAchievableWeight(64)).toBe(65);
    });

    it('should handle weights with 1.25kg increments', () => {
      // 62.5kg = 20 + 21.25 per side? No...
      // 62.5 - 20 = 42.5 / 2 = 21.25 per side
      // 21.25 = 20 + 1.25 - achievable!
      expect(roundToAchievableWeight(62.5)).toBe(62.5);
      
      // 65kg = 20 + 22.5 per side
      // 22.5 = 20 + 2.5 - achievable!
      expect(roundToAchievableWeight(65)).toBe(65);
    });
  });

  describe('roundToAchievablePlates', () => {
    it('should return 0 for zero or negative weight', () => {
      expect(roundToAchievablePlates(0)).toBe(0);
      expect(roundToAchievablePlates(-5)).toBe(0);
    });

    it('should round to nearest achievable per-side weight', () => {
      // 20kg per side is just a 20 plate
      expect(roundToAchievablePlates(20)).toBe(20);
      
      // 30kg per side = 20 + 10
      expect(roundToAchievablePlates(30)).toBe(30);
      
      // 40kg per side = 20 + 20
      expect(roundToAchievablePlates(40)).toBe(40);
      
      // 21.25kg per side = 20 + 1.25
      expect(roundToAchievablePlates(21.25)).toBe(21.25);
    });

    it('should round to nearest achievable', () => {
      // 20.5 per side - 20.5 / 1.25 = 16.4, rounds to 16, 16 * 1.25 = 20
      expect(roundToAchievablePlates(20.5)).toBe(20);
      
      // 22 per side - 22 / 1.25 = 17.6, rounds to 18, 18 * 1.25 = 22.5
      // 22.5 = 20 + 2.5 IS achievable
      expect(roundToAchievablePlates(22)).toBe(22.5);
      
      // 23.5 per side - 23.5 / 1.25 = 18.8, rounds to 19, 19 * 1.25 = 23.75
      // 23.75 IS achievable: 20 + 2.5 + 1.25 = 23.75
      expect(roundToAchievablePlates(23.5)).toBe(23.75);
      
      // 21.3 per side - should round to 21.25
      expect(roundToAchievablePlates(21.3)).toBe(21.25);
    });
  });

  describe('getPlateBreakdown', () => {
    it('should return empty array for zero weight', () => {
      expect(getPlateBreakdown(0)).toEqual([]);
    });

    it('should return single plate when possible', () => {
      expect(getPlateBreakdown(20)).toEqual([20]);
      expect(getPlateBreakdown(10)).toEqual([10]);
      expect(getPlateBreakdown(5)).toEqual([5]);
    });

    it('should return multiple plates for compound weights', () => {
      // 30kg = 20 + 10
      expect(getPlateBreakdown(30)).toEqual([20, 10]);
      
      // 40kg = 20 + 20
      expect(getPlateBreakdown(40)).toEqual([20, 20]);
      
      // 32.5kg = 20 + 10 + 2.5
      expect(getPlateBreakdown(32.5)).toEqual([20, 10, 2.5]);
      
      // 21.25kg = 20 + 1.25
      expect(getPlateBreakdown(21.25)).toEqual([20, 1.25]);
    });

    it('should handle complex combinations', () => {
      // 61.25kg per side - greedy algorithm picks largest plates first
      // 61.25 = 20 + 20 + 20 + 1.25 (3x20kg plates is more than 2x20 + 15 + 5)
      expect(getPlateBreakdown(61.25)).toEqual([20, 20, 20, 1.25]);
      
      // Alternative: 20 + 20 + 15 + 5 + 1.25 also works
      expect(getPlateBreakdown(61.25).reduce((a, b) => a + b, 0)).toBe(61.25);
    });
  });

  describe('getPlateWeightPerSide', () => {
    it('should return null for non-barbell exercises', () => {
      expect(getPlateWeightPerSide(80, false)).toBeNull();
    });

    it('should return 0 for bar weight only', () => {
      expect(getPlateWeightPerSide(20, true)).toBe(0);
      expect(getPlateWeightPerSide(15, true)).toBe(0);
    });

    it('should calculate correct per-side weight', () => {
      // 60kg = 20 bar + 20 per side
      expect(getPlateWeightPerSide(60, true)).toBe(20);
      
      // 80kg = 20 bar + 30 per side
      expect(getPlateWeightPerSide(80, true)).toBe(30);
      
      // 100kg = 20 bar + 40 per side
      expect(getPlateWeightPerSide(100, true)).toBe(40);
    });
  });

  describe('isAchievableWeight', () => {
    it('should return false for weights below bar weight', () => {
      expect(isAchievableWeight(15)).toBe(false);
      expect(isAchievableWeight(0)).toBe(false);
    });

    it('should return true for bar weight only', () => {
      expect(isAchievableWeight(20)).toBe(true);
    });

    it('should return true for achievable weights', () => {
      // 60kg = 20 + 20 + 20
      expect(isAchievableWeight(60)).toBe(true);
      
      // 62.5kg = 20 + 20 + 20 + 1.25 + 1.25
      expect(isAchievableWeight(62.5)).toBe(true);
      
      // 65kg = 20 + 20 + 20 + 2.5 + 2.5
      expect(isAchievableWeight(65)).toBe(true);
    });

    it('should return false for unachievable weights', () => {
      // 61kg - not achievable (20.5 per side)
      expect(isAchievableWeight(61)).toBe(false);
      
      // 63kg - not achievable (21.5 per side)
      expect(isAchievableWeight(63)).toBe(false);
      
      // 86kg - not achievable (33 per side, can't make 33 with available plates)
      expect(isAchievableWeight(86)).toBe(false);
    });
  });

  describe('Problematic weights', () => {
    it('should round 86kg to achievable weight (33kg per side is not possible)', () => {
      // 86kg = 33kg per side, but 33 is not achievable with plates [20, 15, 10, 5, 2.5, 1.25]
      // 33 = 20 + 10 + 2.5 + 0.5 (no 0.5 plate)
      // 33 rounds to nearest 1.25 = 32.5 (26 * 1.25), which IS achievable: 20 + 10 + 2.5
      // So 86kg should round to 85kg (20 bar + 32.5 per side * 2)
      const rounded = roundToAchievableWeight(86);
      expect(isAchievableWeight(rounded)).toBe(true);
      // 86 should round to 85 (32.5 per side is closer than 33.75)
      expect(rounded).toBe(85);
    });

    it('should ensure all generated weights are achievable', () => {
      // Test various weights that might come from percentage calculations
      const problematicWeights = [61, 63, 66, 68, 71, 73, 76, 78, 81, 83, 86, 88, 91];
      
      for (const weight of problematicWeights) {
        const rounded = roundToAchievableWeight(weight);
        expect(isAchievableWeight(rounded)).toBe(true);
        // Rounded weight should be close to original
        expect(Math.abs(rounded - weight)).toBeLessThanOrEqual(2.5);
      }
    });
  });

  describe('Common workout weights', () => {
    // Test common incremental weights that should all be achievable
    const commonWeights = [
      20,   // Just bar
      40,   // Bar + 10 each side
      50,   // Bar + 15 each side
      60,   // Bar + 20 each side
      70,   // Bar + 25 each side (20+5)
      80,   // Bar + 30 each side (20+10)
      90,   // Bar + 35 each side (20+15)
      100,  // Bar + 40 each side (20+20)
      110,  // Bar + 45 each side (20+20+5)
      120,  // Bar + 50 each side (20+20+10)
      130,  // Bar + 55 each side (20+20+15)
      140,  // Bar + 60 each side (20+20+20)
    ];

    it.each(commonWeights)('should achieve %i kg', (weight) => {
      expect(isAchievableWeight(weight)).toBe(true);
      expect(roundToAchievableWeight(weight)).toBe(weight);
    });
  });

  describe('Warmup Optimization', () => {
    describe('countPlates', () => {
      it('should count plates correctly', () => {
        expect(countPlates(0)).toBe(0);
        expect(countPlates(20)).toBe(1);   // One 20kg plate
        expect(countPlates(30)).toBe(2);   // 20 + 10
        expect(countPlates(40)).toBe(2);   // 20 + 20
        expect(countPlates(42.5)).toBe(3); // 20 + 20 + 2.5
      });
    });

    describe('canBuildByAddingOnly', () => {
      it('should return true when target can be built by adding plates', () => {
        // 60kg (20 per side) -> 80kg (30 per side): add 10kg plate
        expect(canBuildByAddingOnly(60, 80)).toBe(true);
        
        // 60kg -> 100kg (40 per side): add two 20kg plates or 20+10+10
        expect(canBuildByAddingOnly(60, 100)).toBe(true);
        
        // 80kg -> 120kg (50 per side = 20+20+10): add 20+10
        expect(canBuildByAddingOnly(80, 120)).toBe(true);
      });

      it('should return false when plates need to be removed or swapped', () => {
        // 80kg (20+10 per side) -> 60kg (20 per side): would need to remove 10
        expect(canBuildByAddingOnly(80, 60)).toBe(false);
        
        // Cannot build same weight
        expect(canBuildByAddingOnly(60, 60)).toBe(false);
        
        // 80kg (20+10 per side) -> 100kg (20+20 per side): would need to swap 10 for 20
        expect(canBuildByAddingOnly(80, 100)).toBe(false);
      });

      it('should handle empty bar transitions', () => {
        // Bar (0 per side) -> 60kg (20 per side): add 20
        expect(canBuildByAddingOnly(20, 60)).toBe(true);
      });
    });

    describe('findOptimalWarmupWeight', () => {
      it('should return current weight if target is lower', () => {
        expect(findOptimalWarmupWeight(80, 60)).toBe(80);
      });

      it('should find weight that builds by adding plates', () => {
        // From 60kg, targeting ~72kg (80% of 90kg work weight)
        // Should find something achievable by only adding plates
        const result = findOptimalWarmupWeight(60, 72);
        expect(result).toBeGreaterThan(60);
        expect(canBuildByAddingOnly(60, result)).toBe(true);
      });

      it('should prefer weights closer to target', () => {
        // From bar (20kg), targeting 50kg
        const result = findOptimalWarmupWeight(20, 50);
        // Should be reasonably close to 50
        expect(result).toBeGreaterThanOrEqual(45);
        expect(result).toBeLessThanOrEqual(55);
      });

      it('should prefer fewer plates when possible', () => {
        // From 60kg, targeting ~72kg
        // 75kg (27.5 per side = 20+5+2.5) uses 3 plates
        // 80kg (30 per side = 20+10) uses 2 plates - should prefer this
        const result = findOptimalWarmupWeight(60, 72);
        const perSide = (result - 20) / 2;
        const plates = countPlates(perSide);
        // Should use reasonably few plates
        expect(plates).toBeLessThanOrEqual(3);
      });
    });

    describe('getPlateDifference', () => {
      it('should show plates to add', () => {
        // 60kg (20 per side) -> 80kg (30 per side = 20+10)
        const diff = getPlateDifference(60, 80);
        expect(diff.remove).toEqual([]);
        expect(diff.add).toEqual([10]);
      });

      it('should show plates to remove', () => {
        // 80kg -> 60kg
        const diff = getPlateDifference(80, 60);
        expect(diff.remove).toEqual([10]);
        expect(diff.add).toEqual([]);
      });

      it('should show both add and remove when needed', () => {
        // 70kg (25 per side = 20+5) -> 80kg (30 per side = 20+10)
        // Need to remove 5, add 10
        const diff = getPlateDifference(70, 80);
        expect(diff.remove).toContain(5);
        expect(diff.add).toContain(10);
      });
    });

    describe('formatPlateChanges', () => {
      it('should format add operations', () => {
        expect(formatPlateChanges(60, 80)).toBe('Add: +10');
      });

      it('should format remove operations', () => {
        expect(formatPlateChanges(80, 60)).toBe('Remove: -10');
      });

      it('should format combined operations', () => {
        const result = formatPlateChanges(70, 80);
        expect(result).toContain('Add:');
        expect(result).toContain('Remove:');
      });

      it('should show no change for same weight', () => {
        expect(formatPlateChanges(60, 60)).toBe('No change');
      });
    });

    describe('Real-world warmup scenarios', () => {
      it('should optimize warmup for 100kg squat', () => {
        // Work weight: 100kg (40kg per side = 20+20)
        // Ideal warmups: 40%, 60%, 80% = 40kg, 60kg, 80kg
        
        const warmups: number[] = [];
        let current = 20; // Bar
        
        // First warmup ~40kg
        const w1 = findOptimalWarmupWeight(current, 40);
        warmups.push(w1);
        current = w1;
        
        // Second warmup ~60kg
        const w2 = findOptimalWarmupWeight(current, 60);
        warmups.push(w2);
        current = w2;
        
        // Third warmup ~80kg
        const w3 = findOptimalWarmupWeight(current, 80);
        warmups.push(w3);
        
        // Verify all warmups build progressively
        expect(warmups[0]).toBeGreaterThan(20);
        expect(warmups[1]).toBeGreaterThan(warmups[0]);
        expect(warmups[2]).toBeGreaterThan(warmups[1]);
        
        // Verify each can be built by adding plates
        expect(canBuildByAddingOnly(20, warmups[0])).toBe(true);
        expect(canBuildByAddingOnly(warmups[0], warmups[1])).toBe(true);
        expect(canBuildByAddingOnly(warmups[1], warmups[2])).toBe(true);
      });

      it('should prefer adding over removing plates', () => {
        // Example: From 30kg per side (20+10), targeting 35kg (ideally 20+15)
        // But 35kg = 20+15 requires removing 10 and adding 15
        // Better: go to 40kg (20+20) - just add another 20
        const result = findOptimalWarmupWeight(60, 70);
        
        // Should be able to build by only adding
        expect(canBuildByAddingOnly(60, result)).toBe(true);
      });
    });
  });
});
