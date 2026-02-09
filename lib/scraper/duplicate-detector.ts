/**
 * Duplicate detection for surfboard listings across vendors
 *
 * Detects when the same board exists from multiple vendors by comparing
 * normalized product names using string similarity matching.
 */

import type { Surfboard } from "@/types";

/**
 * List of known surfboard brands/shapers for extraction
 *
 * Includes common variations (e.g., "CI" for "Channel Islands")
 * Ordered by specificity (longer/more specific first)
 */
export const KNOWN_BRANDS: string[] = [
  // Full names first (longer strings match first)
  "Channel Islands",
  "Chris Christenson",
  "Hawaiian Pro Designs",
  "Donald Takayama",
  "JS Industries",
  "Haydenshapes",
  "Firewire",
  "Pyzel",
  "Lost",
  "DHD",
  "Album",
  "Torq",
  "Bing",
  // Abbreviations (checked after full names)
  "CI",
  "JS",
];

/**
 * Mapping from abbreviations to canonical brand names
 */
const BRAND_ALIASES: Record<string, string> = {
  ci: "channel islands",
  js: "js industries",
};

/**
 * Extracts the brand/shaper name from a product name
 *
 * Searches for known brands anywhere in the product name (start, middle, or end).
 * Returns the normalized (lowercase, trimmed) brand name, or null if not found.
 *
 * @param productName - Raw product name from any source
 * @returns Normalized brand name or null if no known brand is found
 *
 * @example
 * extractBrand("Firewire Seaside 5'8\"")         // "firewire"
 * extractBrand("CI Fishbeard 5'10\"")            // "channel islands"
 * extractBrand("Lost Mayhem Puddle Jumper HP")  // "lost"
 * extractBrand("Unknown Board 5'8\"")           // null
 */
export function extractBrand(productName: string): string | null {
  if (!productName || typeof productName !== "string") {
    return null;
  }

  const normalizedInput = productName.toLowerCase().trim();
  if (!normalizedInput) {
    return null;
  }

  // Check each known brand (ordered by specificity)
  for (const brand of KNOWN_BRANDS) {
    const normalizedBrand = brand.toLowerCase();

    // Check if brand appears in the product name
    // Use word boundary matching to avoid partial matches (e.g., "Lost" shouldn't match "LostWhale")
    const regex = new RegExp(`\\b${escapeRegex(normalizedBrand)}\\b`, "i");
    if (regex.test(normalizedInput)) {
      // Return canonical name if this is an alias
      return BRAND_ALIASES[normalizedBrand] || normalizedBrand;
    }
  }

  return null;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Common color/finish descriptors to remove from product names
 */
const COLOR_FINISH_PATTERNS: string[] = [
  // Colors
  "white",
  "black",
  "blue",
  "red",
  "green",
  "yellow",
  "orange",
  "grey",
  "gray",
  "clear",
  "tint",
  "tinted",
  // Finishes/materials
  "carbon",
  "bamboo",
  "wood",
  "spray",
  "resin",
  // Common suffixes
  "surfboard",
  "surfboards",
  "board",
];

/**
 * Fin system patterns to remove
 * Note: "FCS II" must come before "FCS" to match the full pattern first
 */
const FIN_SYSTEM_PATTERNS: string[] = [
  "fcs ii",
  "fcs2",
  "fcs",
  "futures",
  "future",
  "thruster",
  "quad",
  "twin",
  "single",
  "5 fin",
  "5-fin",
  "ii", // Roman numeral II that might remain after FCS removal
];

/**
 * Technology/construction names to remove
 */
const TECH_PATTERNS: string[] = [
  "helium",
  "lft",
  "pu",
  "eps",
  "epoxy",
  "futureflex",
  "ff",
  "woollight",
  "hydroflex",
  "flexbar",
  "timbertek",
];

/**
 * Words to remove that are common in product names but not part of the model
 */
const NOISE_WORDS: string[] = [
  "by",
  "x",
  "v",
  "vol",
  "volume",
  "liters",
  "l",
  "new",
  "pre-owned",
  "used",
];

/**
 * Dimension patterns to remove from product names
 * These match various formats of surfboard dimensions
 */
const DIMENSION_PATTERNS: RegExp[] = [
  // Full dimensions: 5'8 x 20 1/4 x 2 1/2 or 5'8" x 20.5 x 2.65
  /\d+[''′]?\d*(?:\s+\d+\/\d+)?[""″]?\s*[xX×]\s*\d+(?:\.\d+|\s+\d+\/\d+)?(?:\s*[xX×]\s*\d+(?:\.\d+|\s+\d+\/\d+)?)?/g,
  // Length only: 5'8, 5'8", 5-8, 5'8 1/2
  /\b\d+[''′]\d*(?:\s+\d+\/\d+)?[""″]?\b/g,
  // Dash format: 5-8, 5-10
  /\b\d+-\d{1,2}\b/g,
  // Volume: 27.5L, 28L, V28.8
  /\b[vV]?\d+(?:\.\d+)?[lL]\b/g,
  // Year: 2020, 2021, etc.
  /\b20\d{2}\b/g,
];

/**
 * Extracts the model name from a product title
 *
 * Removes brand name, dimensions, colors, finishes, and other noise
 * to isolate the core model name for comparison.
 *
 * @param productName - Raw product name from any source
 * @param brand - Optional brand name to remove (if already extracted)
 * @returns Normalized model name or empty string if nothing remains
 *
 * @example
 * extractModel("Firewire Seaside 5'8 x 20 1/4 x 2 1/2 - Helium")           // "seaside"
 * extractModel("CI Fishbeard 5'10 x 20 3/4 x 2 5/8 FCS II")                // "fishbeard"
 * extractModel("Lost Mayhem Puddle Jumper HP 5'6 x 20 x 2.35")             // "mayhem puddle jumper hp"
 * extractModel("Haydenshapes Hypto Krypto 5'10 FutureFlex FF - Blue")      // "hypto krypto"
 */
export function extractModel(productName: string, brand?: string | null): string {
  if (!productName || typeof productName !== "string") {
    return "";
  }

  let result = productName.trim();
  if (!result) {
    return "";
  }

  // Remove the brand name if provided
  if (brand) {
    const brandRegex = new RegExp(`\\b${escapeRegex(brand)}\\b`, "gi");
    result = result.replace(brandRegex, " ");
  }

  // Also try to remove known brands from the name (in case brand wasn't provided)
  for (const knownBrand of KNOWN_BRANDS) {
    const brandRegex = new RegExp(`\\b${escapeRegex(knownBrand)}\\b`, "gi");
    result = result.replace(brandRegex, " ");
  }

  // Remove dimension patterns
  for (const pattern of DIMENSION_PATTERNS) {
    result = result.replace(pattern, " ");
  }

  // Convert to lowercase for pattern matching
  result = result.toLowerCase();

  // Remove color/finish descriptors
  for (const pattern of COLOR_FINISH_PATTERNS) {
    const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, "gi");
    result = result.replace(regex, " ");
  }

  // Remove fin system patterns
  for (const pattern of FIN_SYSTEM_PATTERNS) {
    const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, "gi");
    result = result.replace(regex, " ");
  }

  // Remove technology/construction names
  for (const pattern of TECH_PATTERNS) {
    const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, "gi");
    result = result.replace(regex, " ");
  }

  // Remove noise words
  for (const word of NOISE_WORDS) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    result = result.replace(regex, " ");
  }

  // Remove common separators and punctuation
  result = result
    .replace(/[-–—]/g, " ") // dashes to spaces
    .replace(/[()[\]{}]/g, " ") // brackets
    .replace(/['""`´''""]/g, " ") // quotes
    .replace(/[,.:;!?\/\\]/g, " ") // punctuation (including slashes)
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();

  return result;
}

/**
 * Result of dimension normalization
 */
export interface NormalizedDimensions {
  /** Total length in inches (e.g., 5'8" = 68 inches) */
  lengthInches: number;
  /** Original string that was parsed */
  original: string;
}

/**
 * Normalizes surfboard dimensions and extracts length in inches
 *
 * Handles various dimension formats:
 * - "5'8" or "5'8\"" - feet/inches with prime marks
 * - "5ft 8in" - spelled out
 * - "5-8" - dash separator
 * - "5'8 x 19.5 x 2.5" - full dimensions (extracts just length)
 *
 * @param dimensionString - Raw dimension string from product name or dimensions field
 * @returns NormalizedDimensions object with lengthInches, or null if no valid dimension found
 */
export function normalizeDimensions(dimensionString: string): NormalizedDimensions | null {
  if (!dimensionString || typeof dimensionString !== "string") {
    return null;
  }

  const trimmed = dimensionString.trim();
  if (!trimmed) {
    return null;
  }

  // Pattern 1: Full dimensions "5'8 x 19.5 x 2.5" or "5'8\" x 19 1/4 x 2 1/2"
  // Extract just the first dimension (length) before the first 'x'
  const fullDimensionsMatch = trimmed.match(/^(\d+)[''′]?\s*(\d+(?:\s+\d+\/\d+)?)?[""″]?\s*[xX]/i);
  if (fullDimensionsMatch) {
    const feet = parseInt(fullDimensionsMatch[1], 10);
    const inchPart = fullDimensionsMatch[2];
    const inches = parseInchPart(inchPart);
    if (!isNaN(feet)) {
      return {
        lengthInches: feet * 12 + inches,
        original: trimmed,
      };
    }
  }

  // Pattern 2: Feet with prime and optional inches "5'8" or "5'8\"" or "5'8""
  // Also handles "5'" for just feet
  const primeMatch = trimmed.match(/(\d+)[''′]\s*(\d+(?:\s+\d+\/\d+)?)?[""″]?/);
  if (primeMatch) {
    const feet = parseInt(primeMatch[1], 10);
    const inchPart = primeMatch[2];
    const inches = parseInchPart(inchPart);
    if (!isNaN(feet)) {
      return {
        lengthInches: feet * 12 + inches,
        original: trimmed,
      };
    }
  }

  // Pattern 3: Spelled out "5ft 8in" or "5 ft 8 in" or "5ft8in"
  const spelledMatch = trimmed.match(/(\d+)\s*ft\s*(\d+(?:\s+\d+\/\d+)?)?\s*(?:in)?/i);
  if (spelledMatch) {
    const feet = parseInt(spelledMatch[1], 10);
    const inchPart = spelledMatch[2];
    const inches = parseInchPart(inchPart);
    if (!isNaN(feet)) {
      return {
        lengthInches: feet * 12 + inches,
        original: trimmed,
      };
    }
  }

  // Pattern 4: Dash separator "5-8" (feet-inches) - either as whole string or at end
  // Use word boundary to find it at the end of a product name like "Model 5-10"
  const dashMatch = trimmed.match(/\b(\d+)-(\d{1,2})\b/);
  if (dashMatch) {
    const feet = parseInt(dashMatch[1], 10);
    const inches = parseInt(dashMatch[2], 10);
    if (!isNaN(feet) && !isNaN(inches) && feet >= 4 && feet <= 12 && inches >= 0 && inches < 12) {
      return {
        lengthInches: feet * 12 + inches,
        original: trimmed,
      };
    }
  }

  return null;
}

/**
 * Parses an inch part which may include fractions
 * e.g., "8", "8 1/2", "8 3/4", undefined
 */
function parseInchPart(inchPart: string | undefined): number {
  if (!inchPart) {
    return 0;
  }

  const trimmed = inchPart.trim();
  if (!trimmed) {
    return 0;
  }

  // Check for fraction format "8 1/2" or just "1/2"
  const fractionMatch = trimmed.match(/^(\d+)?\s*(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseInt(fractionMatch[1], 10) : 0;
    const numerator = parseInt(fractionMatch[2], 10);
    const denominator = parseInt(fractionMatch[3], 10);
    if (!isNaN(whole) && !isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
      return whole + numerator / denominator;
    }
  }

  // Plain integer
  const plainInt = parseInt(trimmed, 10);
  if (!isNaN(plainInt)) {
    return plainInt;
  }

  return 0;
}

/**
 * Structured signature for a surfboard product
 * Used for accurate duplicate detection by comparing components
 */
export interface ProductSignature {
  /** Normalized brand name or null if unknown */
  brand: string | null;
  /** Normalized model name */
  model: string;
  /** Length in total inches (e.g., 5'8" = 68) or null if not found */
  lengthInches: number | null;
  /** Source identifier (e.g., "hawaiian-south-shore", "surfgarage") */
  source: string;
}

/**
 * Extracts a structured product signature from a surfboard product name
 *
 * @param productName - Raw product name from any source
 * @param source - Source identifier for the product
 * @returns ProductSignature with extracted brand, model, length, and source
 *
 * @example
 * extractProductSignature("Firewire Seaside 5'8 x 20 1/4 x 2 1/2", "hawaiian-south-shore")
 * // { brand: "firewire", model: "seaside", lengthInches: 68, source: "hawaiian-south-shore" }
 */
export function extractProductSignature(productName: string, source: string): ProductSignature {
  // Extract brand
  const brand = extractBrand(productName);

  // Extract model (pass brand to help remove it from the name)
  const model = extractModel(productName, brand);

  // Extract dimensions from the product name
  const dimensions = normalizeDimensions(productName);

  return {
    brand,
    model,
    lengthInches: dimensions?.lengthInches ?? null,
    source,
  };
}

/**
 * Result of comparing two product signatures
 */
export interface SignatureComparisonResult {
  /** Overall match score from 0 to 1 */
  score: number;
  /** Whether brands matched (or at least one was null) */
  brandMatch: boolean;
  /** Similarity of model names (0-1) */
  modelSimilarity: number;
  /** Difference in length in inches (null if either length is unknown) */
  lengthDifferenceInches: number | null;
}

/**
 * Compares two product signatures and returns a match score
 *
 * Matching rules:
 * - Brand must match if both products have a brand (otherwise neutral)
 * - Model similarity must be > 0.8 for a positive match
 * - Length must be within ±1 inch (if both have lengths)
 *
 * @param sig1 - First product signature
 * @param sig2 - Second product signature
 * @returns SignatureComparisonResult with score and component details
 *
 * @example
 * const sig1 = { brand: "firewire", model: "seaside", lengthInches: 68, source: "hss" }
 * const sig2 = { brand: "firewire", model: "seaside", lengthInches: 68, source: "sg" }
 * compareSignatures(sig1, sig2)
 * // { score: 1.0, brandMatch: true, modelSimilarity: 1.0, lengthDifferenceInches: 0 }
 *
 * @example
 * // With custom config
 * compareSignatures(sig1, sig2, { lengthToleranceInches: 2, modelSimilarityThreshold: 0.9 })
 */
export function compareSignatures(
  sig1: ProductSignature,
  sig2: ProductSignature,
  config: DuplicateMatcherConfig = DEFAULT_MATCHER_CONFIG
): SignatureComparisonResult {
  const { lengthToleranceInches, requireBrandMatch, modelSimilarityThreshold } = config;

  // Check brand match
  // If both have brands, they must match
  // If one or both are null, we consider it a neutral match (doesn't hurt)
  // Unless requireBrandMatch is true, then we need both brands to match
  const bothHaveBrands = sig1.brand !== null && sig2.brand !== null;
  const brandMatch = !bothHaveBrands || sig1.brand === sig2.brand;

  // If requireBrandMatch is true and either brand is missing, it's not a match
  const brandCheckPassed = requireBrandMatch ? bothHaveBrands && brandMatch : brandMatch;

  // Calculate model similarity using existing Levenshtein-based function
  const modelSimilarity = calculateSimilarity(sig1.model, sig2.model);

  // Calculate length difference using configurable tolerance
  let lengthDifferenceInches: number | null = null;
  let lengthMatch = true;
  if (sig1.lengthInches !== null && sig2.lengthInches !== null) {
    lengthDifferenceInches = Math.abs(sig1.lengthInches - sig2.lengthInches);
    lengthMatch = lengthDifferenceInches <= lengthToleranceInches;
  }

  // Calculate overall score
  // Must pass all checks for a positive match:
  // 1. Brand match (if requireBrandMatch or both have brands)
  // 2. Model similarity >= threshold
  // 3. Length within tolerance (if both have lengths)

  if (!brandCheckPassed) {
    // Brand check failed
    return {
      score: 0,
      brandMatch: false,
      modelSimilarity,
      lengthDifferenceInches,
    };
  }

  if (modelSimilarity < modelSimilarityThreshold) {
    // Model similarity below threshold
    return {
      score: modelSimilarity * 0.5, // Partial score based on model similarity
      brandMatch,
      modelSimilarity,
      lengthDifferenceInches,
    };
  }

  if (!lengthMatch && lengthDifferenceInches !== null) {
    // Length outside tolerance - penalize based on how far off
    const lengthPenalty = Math.min(lengthDifferenceInches / 6, 0.5); // Max 50% penalty at 3+ inches
    return {
      score: Math.max(0, modelSimilarity - lengthPenalty),
      brandMatch,
      modelSimilarity,
      lengthDifferenceInches,
    };
  }

  // All checks passed - calculate final score
  // Weight: brand match (20%), model similarity (60%), length match (20%)
  let score = modelSimilarity * 0.6;

  if (bothHaveBrands && brandMatch) {
    score += 0.2; // Brand match bonus
  } else if (!bothHaveBrands && !requireBrandMatch) {
    score += 0.1; // Neutral - only half bonus when brands unknown (and not required)
  }

  if (sig1.lengthInches !== null && sig2.lengthInches !== null && lengthMatch) {
    score += 0.2; // Length match bonus
  } else if (sig1.lengthInches === null || sig2.lengthInches === null) {
    score += 0.1; // Neutral - only half bonus when lengths unknown
  }

  return {
    score: Math.min(score, 1), // Cap at 1.0
    brandMatch,
    modelSimilarity,
    lengthDifferenceInches,
  };
}

/**
 * Result of a duplicate match between two products
 */
export interface DuplicateMatch {
  /** Sanity document ID of the first product */
  productId: string;
  /** Sanity document ID of the matched product */
  matchedProductId: string;
  /** Overall confidence score between 0 and 1 */
  similarity: number;
  /** Whether the brands matched (or were neutral if one/both null) */
  brandMatch: boolean;
  /** Similarity of the model names (0-1) */
  modelSimilarity: number;
  /** Difference in length in inches (null if either length is unknown) */
  lengthDifferenceInches: number | null;
  /** Extracted brand from first product */
  brand1: string | null;
  /** Extracted brand from second product */
  brand2: string | null;
  /** Extracted model from first product */
  model1: string;
  /** Extracted model from second product */
  model2: string;
  /** Extracted length from first product in inches */
  length1: number | null;
  /** Extracted length from second product in inches */
  length2: number | null;
}

/**
 * Options for duplicate detection
 */
export interface DuplicateDetectorOptions {
  /** Minimum similarity threshold (0-1). Default: 0.85 */
  threshold?: number;
  /** Only match products from different sources. Default: true */
  crossSourceOnly?: boolean;
  /** Configuration for matching behavior. Uses DEFAULT_MATCHER_CONFIG if not provided */
  config?: Partial<DuplicateMatcherConfig>;
}

/**
 * Configuration for duplicate matching behavior
 *
 * Allows fine-tuning of duplicate detection without code changes.
 * All values have sensible defaults defined in DEFAULT_MATCHER_CONFIG.
 *
 * @example
 * // Stricter matching - only link high-confidence matches
 * const strictConfig: DuplicateMatcherConfig = {
 *   lengthToleranceInches: 0.5,
 *   requireBrandMatch: true,
 *   modelSimilarityThreshold: 0.9,
 *   minConfidenceToAutoLink: 0.85,
 * };
 *
 * // More permissive matching - for manual review
 * const looseConfig: DuplicateMatcherConfig = {
 *   lengthToleranceInches: 2,
 *   requireBrandMatch: false,
 *   modelSimilarityThreshold: 0.7,
 *   minConfidenceToAutoLink: 0.6,
 * };
 */
export interface DuplicateMatcherConfig {
  /**
   * Maximum difference in length (inches) to consider boards the same size.
   * Surfboards from different sources may have slight measurement variations.
   * Default: 1 inch
   *
   * @example
   * // A 5'8" (68") board will match a 5'9" (69") board with default tolerance
   * // But not a 5'10" (70") board
   */
  lengthToleranceInches: number;

  /**
   * Whether to require both products have known, matching brands for auto-linking.
   * When true, if either product has an unknown brand, they won't be auto-linked.
   * When false, unknown brands are treated as neutral (don't prevent matching).
   * Default: false (backwards compatible - allows matching when brands unknown)
   *
   * @example
   * // If true: "Firewire Seaside 5'8" won't match "Seaside 5'8" (unknown brand)
   * // If false: They can still match if model similarity is high enough
   */
  requireBrandMatch: boolean;

  /**
   * Minimum model name similarity (0-1) required for a match.
   * Uses Levenshtein distance normalized by string length.
   * Higher values = stricter matching, fewer false positives.
   * Default: 0.8
   *
   * @example
   * // "seaside" vs "seaside" = 1.0 (exact match)
   * // "seaside" vs "seasid" = 0.86 (typo - would match with 0.8 threshold)
   * // "seaside" vs "puddle" = 0.0 (no match)
   */
  modelSimilarityThreshold: number;

  /**
   * Minimum overall confidence score (0-1) required to automatically link products.
   * Matches below this threshold will be reported but not auto-linked.
   * Default: 0.7
   *
   * @example
   * // Score 0.85 with threshold 0.7 = auto-link
   * // Score 0.65 with threshold 0.7 = report only, manual review needed
   */
  minConfidenceToAutoLink: number;
}

/**
 * Default configuration for duplicate matching
 *
 * These defaults balance accuracy with flexibility:
 * - 1 inch length tolerance accounts for measurement variations
 * - 0.8 model similarity allows for minor naming differences
 * - 0.7 confidence threshold catches most duplicates while reducing false positives
 * - requireBrandMatch: false allows matching when brands are unknown (backwards compatible)
 */
export const DEFAULT_MATCHER_CONFIG: DuplicateMatcherConfig = {
  lengthToleranceInches: 1,
  requireBrandMatch: false,
  modelSimilarityThreshold: 0.8,
  minConfidenceToAutoLink: 0.7,
};

/**
 * Normalizes a product name for comparison
 * - Converts to lowercase
 * - Removes special characters except spaces
 * - Collapses multiple spaces to single space
 * - Trims whitespace
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Creates a comparison key from shaper + product name
 * This combines the shaper (brand) with the model name for better matching
 */
export function createComparisonKey(shaper: string | undefined, name: string): string {
  const normalizedShaper = shaper ? normalizeName(shaper) : "";
  const normalizedName = normalizeName(name);

  // If shaper is already in the name, just use the name
  if (normalizedShaper && normalizedName.includes(normalizedShaper)) {
    return normalizedName;
  }

  // Otherwise combine shaper + name
  return normalizedShaper ? `${normalizedShaper} ${normalizedName}` : normalizedName;
}

/**
 * Calculates Levenshtein distance between two strings
 * Used as the basis for similarity calculation
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Calculates similarity between two strings as a value between 0 and 1
 * Uses Levenshtein distance normalized by the length of the longer string
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  return 1 - distance / maxLength;
}

/**
 * Logs detailed match information for a duplicate match
 *
 * @param match - The duplicate match to log
 * @param productName1 - Name of the first product
 * @param productName2 - Name of the second product
 */
export function logMatchDetails(
  match: DuplicateMatch,
  productName1: string,
  productName2: string
): void {
  const lengthInfo =
    match.lengthDifferenceInches !== null
      ? `${match.lengthDifferenceInches}" diff`
      : "unknown lengths";

  console.log(`\n${"─".repeat(60)}`);
  console.log(`DUPLICATE MATCH (${(match.similarity * 100).toFixed(1)}% confidence)`);
  console.log(`${"─".repeat(60)}`);
  console.log(`Product 1: ${productName1}`);
  console.log(`Product 2: ${productName2}`);
  console.log(`${"─".repeat(60)}`);
  console.log(
    `Brand:    ${match.brand1 || "(unknown)"} vs ${match.brand2 || "(unknown)"} → ${match.brandMatch ? "✓ match" : "✗ mismatch"}`
  );
  console.log(
    `Model:    "${match.model1}" vs "${match.model2}" → ${(match.modelSimilarity * 100).toFixed(1)}% similar`
  );
  console.log(
    `Length:   ${match.length1 !== null ? `${match.length1}"` : "?"} vs ${match.length2 !== null ? `${match.length2}"` : "?"} → ${lengthInfo}`
  );
  console.log(`${"─".repeat(60)}`);
}

/**
 * Finds duplicate listings among surfboard products
 *
 * Uses structured comparison (brand + model + dimensions) to accurately
 * detect duplicates across vendors with different naming conventions.
 *
 * @param products - Array of Surfboard documents from Sanity
 * @param options - Detection options including:
 *   - threshold: Minimum similarity score (0-1). Default: 0.85
 *   - crossSourceOnly: Only match products from different sources. Default: true
 *   - config: DuplicateMatcherConfig for fine-tuning matching behavior
 * @returns Array of duplicate matches found with detailed match info
 *
 * @example
 * // Basic usage with defaults
 * const matches = findDuplicates(products);
 *
 * @example
 * // Custom threshold
 * const matches = findDuplicates(products, { threshold: 0.9 });
 *
 * @example
 * // Custom matching configuration
 * const matches = findDuplicates(products, {
 *   config: {
 *     lengthToleranceInches: 2,
 *     modelSimilarityThreshold: 0.7,
 *   }
 * });
 */
export function findDuplicates(
  products: Surfboard[],
  options: DuplicateDetectorOptions = {}
): DuplicateMatch[] {
  const { threshold = 0.85, crossSourceOnly = true, config } = options;
  const matches: DuplicateMatch[] = [];

  // Merge provided config with defaults
  const effectiveConfig: DuplicateMatcherConfig = {
    ...DEFAULT_MATCHER_CONFIG,
    ...config,
  };

  // Pre-compute product signatures for all products
  const productSignatures = products.map((product) => ({
    id: product._id,
    source: product.source || "unknown",
    name: product.name,
    signature: extractProductSignature(product.name, product.source || "unknown"),
  }));

  // Compare each pair of products using structured comparison
  for (let i = 0; i < productSignatures.length; i++) {
    for (let j = i + 1; j < productSignatures.length; j++) {
      const productA = productSignatures[i];
      const productB = productSignatures[j];

      // Skip if crossSourceOnly and products are from the same source
      if (crossSourceOnly && productA.source === productB.source) {
        continue;
      }

      // Compare signatures using the effective config
      const comparison = compareSignatures(productA.signature, productB.signature, effectiveConfig);

      if (comparison.score >= threshold) {
        matches.push({
          productId: productA.id,
          matchedProductId: productB.id,
          similarity: comparison.score,
          brandMatch: comparison.brandMatch,
          modelSimilarity: comparison.modelSimilarity,
          lengthDifferenceInches: comparison.lengthDifferenceInches,
          brand1: productA.signature.brand,
          brand2: productB.signature.brand,
          model1: productA.signature.model,
          model2: productB.signature.model,
          length1: productA.signature.lengthInches,
          length2: productB.signature.lengthInches,
        });
      }
    }
  }

  return matches;
}
