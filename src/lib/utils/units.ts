// ============================================================================
// Unit Conversion Utilities
// ============================================================================

// Conversion factors
const KG_TO_LBS = 2.20462;
const CM_TO_INCHES = 0.393701;
const INCHES_TO_FEET = 12;

// ============================================================================
// Weight Conversions
// ============================================================================

/**
 * Convert kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LBS * 10) / 10;
}

/**
 * Convert pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return Math.round((lbs / KG_TO_LBS) * 10) / 10;
}

/**
 * Convert weight based on unit preference
 */
export function convertWeight(value: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number {
  if (from === to) return value;
  return from === 'kg' ? kgToLbs(value) : lbsToKg(value);
}

// ============================================================================
// Distance/Height Conversions
// ============================================================================

/**
 * Convert centimeters to inches
 */
export function cmToInches(cm: number): number {
  return Math.round(cm * CM_TO_INCHES * 10) / 10;
}

/**
 * Convert inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return Math.round((inches / CM_TO_INCHES) * 10) / 10;
}

/**
 * Convert height based on unit preference
 */
export function convertHeight(value: number, from: 'cm' | 'inches', to: 'cm' | 'inches'): number {
  if (from === to) return value;
  return from === 'cm' ? cmToInches(value) : inchesToCm(value);
}

// ============================================================================
// Formatting Functions
// ============================================================================

export interface FormatWeightOptions {
  showUnit?: boolean;
  decimals?: number;
}

/**
 * Format weight for display with unit
 * Input weight should be in kg (database normalized)
 */
export function formatWeight(
  kg: number,
  unit: 'kg' | 'lbs',
  options: FormatWeightOptions = {}
): string {
  const { showUnit = true, decimals = 1 } = options;

  let value: number;
  let unitLabel: string;

  if (unit === 'lbs') {
    value = kgToLbs(kg);
    unitLabel = 'lbs';
  } else {
    value = kg;
    unitLabel = 'kg';
  }

  const formatted = decimals === 0
    ? Math.round(value).toString()
    : value.toFixed(decimals);

  return showUnit ? `${formatted} ${unitLabel}` : formatted;
}

/**
 * Format height for display
 * Input height should be in cm (database normalized)
 */
export function formatHeight(
  cm: number,
  unit: 'cm' | 'inches' | 'ft-in'
): string {
  if (unit === 'cm') {
    return `${Math.round(cm)} cm`;
  }

  const totalInches = cm * CM_TO_INCHES;

  if (unit === 'inches') {
    return `${Math.round(totalInches)}"`;
  }

  // ft-in format (e.g., "5'11\"")
  const feet = Math.floor(totalInches / INCHES_TO_FEET);
  const inches = Math.round(totalInches % INCHES_TO_FEET);
  return `${feet}'${inches}"`;
}

/**
 * Format BMI with category
 */
export function formatBMI(bmi: number): { value: string; category: string; color: string } {
  const value = bmi.toFixed(1);
  
  if (bmi < 18.5) {
    return { value, category: 'Underweight', color: 'text-yellow-500' };
  } else if (bmi < 25) {
    return { value, category: 'Normal', color: 'text-green-500' };
  } else if (bmi < 30) {
    return { value, category: 'Overweight', color: 'text-orange-500' };
  } else {
    return { value, category: 'Obese', color: 'text-red-500' };
  }
}

// ============================================================================
// Normalization Functions (for database storage)
// ============================================================================

/**
 * Normalize weight input to kg for storage
 */
export function normalizeWeightInput(value: number, inputUnit: 'kg' | 'lbs'): number {
  return inputUnit === 'lbs' ? lbsToKg(value) : value;
}

/**
 * Normalize height input to cm for storage
 */
export function normalizeHeightInput(value: number, inputUnit: 'cm' | 'inches'): number {
  return inputUnit === 'inches' ? inchesToCm(value) : value;
}

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationRange {
  min: number;
  max: number;
}

export const WEIGHT_RANGES: Record<'kg' | 'lbs', ValidationRange> = {
  kg: { min: 30, max: 300 },
  lbs: { min: 66, max: 660 },
};

export const HEIGHT_RANGES: Record<'cm' | 'inches', ValidationRange> = {
  cm: { min: 100, max: 250 },
  inches: { min: 39, max: 98 },
};

/**
 * Validate weight value
 */
export function validateWeight(value: number, unit: 'kg' | 'lbs'): { valid: boolean; error?: string } {
  const range = WEIGHT_RANGES[unit];
  if (value < range.min || value > range.max) {
    return {
      valid: false,
      error: `Weight must be between ${range.min}-${range.max} ${unit}`,
    };
  }
  return { valid: true };
}

/**
 * Validate height value
 */
export function validateHeight(value: number, unit: 'cm' | 'inches'): { valid: boolean; error?: string } {
  const range = HEIGHT_RANGES[unit];
  if (value < range.min || value > range.max) {
    return {
      valid: false,
      error: `Height must be between ${range.min}-${range.max} ${unit}`,
    };
  }
  return { valid: true };
}

// ============================================================================
// BMI Calculation
// ============================================================================

/**
 * Calculate BMI from weight (kg) and height (cm)
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

// ============================================================================
// Plate Weight Calculation
// ============================================================================

const BAR_WEIGHT_KG = 20;
const BAR_WEIGHT_LBS = 45;

// Standard plate sizes
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];

/**
 * Calculate plate weight needed per side
 */
export function calculatePlatesPerSide(
  totalWeight: number,
  unit: 'kg' | 'lbs'
): number | null {
  const barWeight = unit === 'kg' ? BAR_WEIGHT_KG : BAR_WEIGHT_LBS;
  
  if (totalWeight <= barWeight) {
    return 0; // Just the bar
  }

  const platesTotal = totalWeight - barWeight;
  return platesTotal / 2;
}

/**
 * Format plate loading instruction
 */
export function formatPlateLoading(
  totalWeight: number,
  unit: 'kg' | 'lbs'
): string | null {
  const perSide = calculatePlatesPerSide(totalWeight, unit);
  
  if (perSide === null) return null;
  if (perSide === 0) return 'Bar only';

  const plates = unit === 'kg' ? PLATES_KG : PLATES_LBS;
  const loading: number[] = [];
  let remaining = perSide;

  // Greedy algorithm to find plate combination
  for (const plate of plates) {
    while (remaining >= plate - 0.1) { // Small tolerance for floating point
      loading.push(plate);
      remaining -= plate;
    }
  }

  if (loading.length === 0) {
    return `${perSide.toFixed(1)} ${unit} per side`;
  }

  // Group consecutive same plates
  const grouped: string[] = [];
  let current = loading[0];
  let count = 1;

  for (let i = 1; i < loading.length; i++) {
    if (loading[i] === current) {
      count++;
    } else {
      grouped.push(count > 1 ? `${count}×${current}` : `${current}`);
      current = loading[i];
      count = 1;
    }
  }
  grouped.push(count > 1 ? `${count}×${current}` : `${current}`);

  return `${grouped.join(' + ')} ${unit} per side`;
}

// ============================================================================
// Utility Helpers
// ============================================================================

/**
 * Round weight to nearest plate increment
 */
export function roundToPlateIncrement(weight: number, unit: 'kg' | 'lbs'): number {
  const increment = unit === 'kg' ? 2.5 : 5;
  return Math.round(weight / increment) * increment;
}

/**
 * Check if a unit preference is metric
 */
export function isMetric(unitPreference: { weightUnit: string }): boolean {
  return unitPreference.weightUnit === 'kg';
}

/**
 * Get opposite unit
 */
export function getOppositeUnit(unit: 'kg' | 'lbs'): 'lbs' | 'kg';
export function getOppositeUnit(unit: 'cm' | 'inches'): 'inches' | 'cm';
export function getOppositeUnit(unit: string): string {
  const opposites: Record<string, string> = {
    kg: 'lbs',
    lbs: 'kg',
    cm: 'inches',
    inches: 'cm',
  };
  return opposites[unit] || unit;
}
