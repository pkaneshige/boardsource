/**
 * Scraper configuration for surfgarage.squarespace.com
 *
 * Site Structure Documentation:
 * ============================
 *
 * Platform: Squarespace Commerce
 *
 * Collection URL Pattern:
 * - /longboards - Longboards
 * - /shortboards - Shortboards
 * - /alternativeboards - Alternative/experimental boards
 * - /guns - Gun boards for big waves
 * - /vintageboards - Vintage/retro boards
 *
 * JSON API Access:
 * - Append ?format=json to any page URL to get JSON response
 * - Collection: /<category>?format=json
 * - Product detail: /<category>/<product-id>?format=json
 *
 * Product Data Structure:
 * - Price is in cents (divide by 100 for dollars)
 * - Images are in the `items` array (not `images`)
 * - Product URL identifier is `urlId` (used in URL paths)
 */

import type { SurfboardCategory } from "@/types";

/**
 * Base URL for Surf Garage website
 */
export const SURFGARAGE_BASE_URL = "https://surfgarage.squarespace.com";

/**
 * Source identifier for Surf Garage products
 */
export const SURFGARAGE_SOURCE = "surfgarage" as const;

/**
 * Display name for Surf Garage
 */
export const SURFGARAGE_SOURCE_NAME = "Surf Garage";

/**
 * Categories/collections available on Surf Garage
 */
export const SURFGARAGE_CATEGORIES = [
  "longboards",
  "shortboards",
  "alternativeboards",
  "guns",
  "vintageboards",
] as const;

export type SurfgarageCategory = (typeof SURFGARAGE_CATEGORIES)[number];

/**
 * Map Surfgarage categories to SurfboardCategory enum
 */
export const CATEGORY_MAPPING: Record<SurfgarageCategory, SurfboardCategory> = {
  longboards: "longboard",
  shortboards: "shortboard",
  alternativeboards: "other",
  guns: "gun",
  vintageboards: "other",
};

/**
 * Rate limiting configuration for Surf Garage scraper
 */
export const surfgarageRateLimit = {
  /** Minimum delay between requests in milliseconds */
  minDelayMs: 2000,

  /** Maximum delay between requests in milliseconds (for jitter) */
  maxDelayMs: 3000,

  /** Maximum concurrent requests */
  maxConcurrent: 1,
};

/**
 * Request timeout in milliseconds
 */
export const SURFGARAGE_TIMEOUT_MS = 30000;

/**
 * Request headers to mimic a browser
 */
export const surfgarageHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * URL builders for Surf Garage scraper
 */
export const surfgarageUrls = {
  /**
   * Build category/collection JSON URL
   * @param category - Category slug (e.g., "longboards")
   */
  getCategoryUrl: (category: SurfgarageCategory): string =>
    `${SURFGARAGE_BASE_URL}/${category}?format=json`,

  /**
   * Build single product JSON URL
   * @param category - Category slug the product belongs to
   * @param productUrlId - Product's urlId (URL identifier)
   */
  getProductUrl: (category: SurfgarageCategory, productUrlId: string): string =>
    `${SURFGARAGE_BASE_URL}/${category}/${productUrlId}?format=json`,

  /**
   * Build product page URL (for sourceUrl)
   * @param category - Category slug the product belongs to
   * @param productUrlId - Product's urlId (URL identifier)
   */
  getProductPageUrl: (category: SurfgarageCategory, productUrlId: string): string =>
    `${SURFGARAGE_BASE_URL}/${category}/${productUrlId}`,
};

/**
 * Map a Surfgarage category to a SurfboardCategory
 * @param category - The Surfgarage category slug
 */
export function mapCategory(category: SurfgarageCategory): SurfboardCategory {
  return CATEGORY_MAPPING[category];
}

/**
 * Sleep function for rate limiting
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get random delay within Surf Garage rate limit bounds
 */
export function getSurfgarageRandomDelay(): number {
  const { minDelayMs, maxDelayMs } = surfgarageRateLimit;
  return Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
}
