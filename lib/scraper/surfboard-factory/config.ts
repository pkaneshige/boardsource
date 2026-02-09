/**
 * Scraper configuration for surfboardfactoryhawaii.com
 *
 * Site Structure Documentation:
 * ============================
 *
 * Platform: WordPress + WooCommerce
 *
 * API Endpoint:
 * - /wp-json/wc/store/v1/products - WooCommerce Store API (publicly accessible)
 * - Pagination via `page` and `per_page` params
 * - Headers include X-WP-Total and X-WP-TotalPages
 *
 * Surfboard Categories (WooCommerce IDs):
 * - 22: Surfboards (parent category)
 * - 25: Groveler
 * - 27: High Performance
 * - 24: Hybrid
 * - 26: Longboard
 * - 1764: Midlength
 * - 1034: Used Surfboards
 *
 * Price Format:
 * - Prices in minor units (cents), e.g., "72500" = $725.00
 * - Parse with: parseInt(price) / 100
 */

import type { SurfboardCategory, SurfboardSource } from "@/types";

/**
 * Base URL for Surfboard Factory Hawaii website
 */
export const SURFBOARD_FACTORY_BASE_URL = "https://www.surfboardfactoryhawaii.com";

/**
 * WooCommerce Store API base URL
 */
export const SURFBOARD_FACTORY_API_URL = `${SURFBOARD_FACTORY_BASE_URL}/wp-json/wc/store/v1`;

/**
 * Source identifier for Surfboard Factory products
 */
export const SURFBOARD_FACTORY_SOURCE: SurfboardSource = "surfboard-factory";

/**
 * Display name for Surfboard Factory Hawaii
 */
export const SURFBOARD_FACTORY_SOURCE_NAME = "Surfboard Factory Hawaii";

/**
 * WooCommerce category IDs for surfboards
 */
export const SURFBOARD_FACTORY_CATEGORY_IDS = {
  surfboards: 22, // Parent category
  groveler: 25,
  highPerformance: 27,
  hybrid: 24,
  longboard: 26,
  midlength: 1764,
  usedSurfboards: 1034,
} as const;

/**
 * Category slugs from WooCommerce
 */
export const SURFBOARD_FACTORY_CATEGORIES = [
  "groveler",
  "high-performance",
  "hybrid",
  "longboard",
  "midlength-surfboards",
  "used-surfboards",
] as const;

export type SurfboardFactoryCategory = (typeof SURFBOARD_FACTORY_CATEGORIES)[number];

/**
 * Map WooCommerce category slugs to SurfboardCategory enum
 */
export const CATEGORY_MAPPING: Record<string, SurfboardCategory> = {
  groveler: "fish", // Grovelers are typically fish-like performance boards
  "high-performance": "shortboard",
  hybrid: "funboard",
  longboard: "longboard",
  "midlength-surfboards": "mid-length",
  "used-surfboards": "other",
  surfboards: "other", // Fallback for parent category
};

/**
 * Rate limiting configuration for Surfboard Factory scraper
 */
export const surfboardFactoryRateLimit = {
  /** Minimum delay between requests in milliseconds */
  minDelayMs: 2000,

  /** Maximum delay between requests in milliseconds (for jitter) */
  maxDelayMs: 3000,

  /** Maximum concurrent requests */
  maxConcurrent: 1,
};

/**
 * Pagination configuration
 */
export const surfboardFactoryPagination = {
  /** Products per page (matches site display) */
  perPage: 24,

  /** Maximum products per API request */
  maxPerPage: 100,
};

/**
 * Request timeout in milliseconds
 */
export const SURFBOARD_FACTORY_TIMEOUT_MS = 30000;

/**
 * Request headers for API calls
 */
export const surfboardFactoryHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * URL builders for Surfboard Factory scraper
 */
export const surfboardFactoryUrls = {
  /**
   * Build products API URL with pagination
   * @param page - Page number (1-indexed)
   * @param perPage - Products per page
   */
  getProductsUrl: (
    page: number = 1,
    perPage: number = surfboardFactoryPagination.perPage
  ): string => `${SURFBOARD_FACTORY_API_URL}/products?page=${page}&per_page=${perPage}`,

  /**
   * Build products API URL filtered by category
   * @param categoryId - WooCommerce category ID
   * @param page - Page number (1-indexed)
   * @param perPage - Products per page
   */
  getProductsByCategoryUrl: (
    categoryId: number,
    page: number = 1,
    perPage: number = surfboardFactoryPagination.perPage
  ): string =>
    `${SURFBOARD_FACTORY_API_URL}/products?category=${categoryId}&page=${page}&per_page=${perPage}`,

  /**
   * Build single product API URL
   * @param productId - WooCommerce product ID
   */
  getProductUrl: (productId: number): string =>
    `${SURFBOARD_FACTORY_API_URL}/products/${productId}`,

  /**
   * Build categories API URL
   */
  getCategoriesUrl: (): string => `${SURFBOARD_FACTORY_API_URL}/products/categories`,
};

/**
 * Map a WooCommerce category slug to a SurfboardCategory
 * @param categorySlug - The WooCommerce category slug
 */
export function mapCategory(categorySlug: string): SurfboardCategory {
  return CATEGORY_MAPPING[categorySlug] ?? "other";
}

/**
 * Sleep function for rate limiting
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get random delay within Surfboard Factory rate limit bounds
 */
export function getSurfboardFactoryRandomDelay(): number {
  const { minDelayMs, maxDelayMs } = surfboardFactoryRateLimit;
  return Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
}

/**
 * Parse WooCommerce price from minor units (cents) to dollars
 * @param priceString - Price string in minor units (e.g., "72500")
 * @returns Price in dollars (e.g., 725.00)
 */
export function parseWooCommercePrice(priceString: string): number {
  const cents = parseInt(priceString, 10);
  if (isNaN(cents)) return 0;
  return cents / 100;
}

/**
 * Generate source ID for a Surfboard Factory product
 * @param productId - WooCommerce product ID
 */
export function generateSourceId(productId: number): string {
  return `surfboard-factory-${productId}`;
}
