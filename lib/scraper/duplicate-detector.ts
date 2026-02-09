/**
 * Duplicate detection for surfboard listings across vendors
 *
 * Detects when the same board exists from multiple vendors by comparing
 * normalized product names using string similarity matching.
 */

import type { Surfboard } from "@/types";

/**
 * Result of a duplicate match between two products
 */
export interface DuplicateMatch {
  /** Sanity document ID of the first product */
  productId: string;
  /** Sanity document ID of the matched product */
  matchedProductId: string;
  /** Similarity score between 0 and 1 */
  similarity: number;
}

/**
 * Options for duplicate detection
 */
export interface DuplicateDetectorOptions {
  /** Minimum similarity threshold (0-1). Default: 0.85 */
  threshold?: number;
  /** Only match products from different sources. Default: true */
  crossSourceOnly?: boolean;
}

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
 * Finds duplicate listings among surfboard products
 *
 * Compares products using normalized shaper + name combination with
 * Levenshtein-based similarity matching.
 *
 * @param products - Array of Surfboard documents from Sanity
 * @param options - Detection options (threshold, crossSourceOnly)
 * @returns Array of duplicate matches found
 */
export function findDuplicates(
  products: Surfboard[],
  options: DuplicateDetectorOptions = {}
): DuplicateMatch[] {
  const { threshold = 0.85, crossSourceOnly = true } = options;
  const matches: DuplicateMatch[] = [];

  // Pre-compute comparison keys for all products
  const productKeys = products.map((product) => ({
    id: product._id,
    source: product.source,
    key: createComparisonKey(product.shaper, product.name),
  }));

  // Compare each pair of products
  for (let i = 0; i < productKeys.length; i++) {
    for (let j = i + 1; j < productKeys.length; j++) {
      const productA = productKeys[i];
      const productB = productKeys[j];

      // Skip if crossSourceOnly and products are from the same source
      if (crossSourceOnly && productA.source === productB.source) {
        continue;
      }

      const similarity = calculateSimilarity(productA.key, productB.key);

      if (similarity >= threshold) {
        matches.push({
          productId: productA.id,
          matchedProductId: productB.id,
          similarity,
        });
      }
    }
  }

  return matches;
}
