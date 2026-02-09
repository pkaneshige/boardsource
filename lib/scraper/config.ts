/**
 * Scraper configuration for hawaiiansouthshore.com
 *
 * Site Structure Documentation:
 * ============================
 *
 * Platform: Shopify (hawaiiansouthshore.myshopify.com)
 *
 * Product List URL Pattern:
 * - Main collection: /collections/surfboards
 * - Category collections:
 *   - /collections/shortboards
 *   - /collections/funboard
 *   - /collections/shop-longboards-surfboards-honolulu-hawaii (longboards)
 *   - /collections/fish
 *   - Brand-specific: /collections/firewire, /collections/lost, etc.
 *
 * Pagination Method:
 * - Shopify standard query parameters: ?page=N&limit=N
 * - Default limit: 30 products per page
 * - Max limit: 250 products per page
 * - Page numbering starts at 1
 *
 * Product Detail URL Pattern:
 * - /products/{product-handle}
 * - Example: /products/firewire-machadocado-52-62-futures-helium-2-surfboard
 *
 * JSON API Endpoints:
 * - Collection products: /collections/{handle}/products.json?page=N&limit=N
 * - All products: /products.json?page=N&limit=N
 * - Single product: /products/{handle}.json
 *
 * Product Data Structure:
 * - Dimensions/volume encoded in variant titles (e.g., "5'4 X 20 13/16 X 2 1/4 V28.8 - Grey")
 * - Vendor field contains brand/shaper
 * - body_html contains detailed specs in HTML tables
 * - Tags used for categorization (shortboard, longboard, etc.)
 */

import type { SurfboardCategory } from "@/types";

/**
 * Base configuration for the scraper
 */
export const scraperConfig = {
  /** Base URL for the Hawaiian South Shore website */
  baseUrl: "https://www.hawaiiansouthshore.com",

  /** Rate limiting settings */
  rateLimit: {
    /** Minimum delay between requests in milliseconds */
    minDelayMs: 1000,

    /** Maximum delay between requests in milliseconds (for jitter) */
    maxDelayMs: 2000,

    /** Maximum concurrent requests */
    maxConcurrent: 1,
  },

  /** Pagination settings */
  pagination: {
    /** Number of products to fetch per page (Shopify max is 250) */
    pageSize: 250,

    /** Maximum pages to fetch (safety limit) */
    maxPages: 50,
  },

  /** Collections to scrape */
  collections: [
    {
      handle: "surfboards",
      name: "All Surfboards",
      category: null, // Mixed categories
    },
  ] as const,

  /** Request headers to mimic a browser */
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
  },

  /** Request timeout in milliseconds */
  timeoutMs: 30000,
} as const;

/**
 * URL builders for the scraper
 */
export const urls = {
  /** Build collection products JSON URL */
  collectionProducts: (
    handle: string,
    page: number = 1,
    limit: number = scraperConfig.pagination.pageSize
  ): string =>
    `${scraperConfig.baseUrl}/collections/${handle}/products.json?page=${page}&limit=${limit}`,

  /** Build single product JSON URL */
  product: (handle: string): string => `${scraperConfig.baseUrl}/products/${handle}.json`,

  /** Build product page URL (for sourceUrl) */
  productPage: (handle: string): string => `${scraperConfig.baseUrl}/products/${handle}`,
};

/**
 * Tag-to-category mapping for inferring surfboard category
 */
export const categoryTagMapping: Record<string, SurfboardCategory> = {
  shortboard: "shortboard",
  shortboards: "shortboard",
  "short board": "shortboard",
  longboard: "longboard",
  longboards: "longboard",
  "long board": "longboard",
  funboard: "funboard",
  funboards: "funboard",
  "fun board": "funboard",
  "mid-length": "mid-length",
  midlength: "mid-length",
  "mid length": "mid-length",
  fish: "fish",
  gun: "gun",
  guns: "gun",
};

/**
 * Product type to category mapping
 */
export const productTypeMapping: Record<string, SurfboardCategory> = {
  Shortboard: "shortboard",
  Shortboards: "shortboard",
  Longboard: "longboard",
  Longboards: "longboard",
  Funboard: "funboard",
  "Mid-Length": "mid-length",
  Fish: "fish",
  Gun: "gun",
};

/**
 * Regex patterns for extracting dimensions and volume from variant titles or descriptions
 */
export const parsePatterns = {
  /**
   * Matches dimensions like "5'4 x 20 13/16 x 2 1/4" or "5'4 X 20 13/16 X 2 1/4"
   * Captures: full dimension string
   */
  dimensions:
    /(\d+'?\d*(?:\s*[-\/]?\s*\d+)?["']?\s*[xX]\s*\d+(?:\s+\d+\/\d+)?\s*[xX]\s*\d+(?:\s+\d+\/\d+)?)/,

  /**
   * Matches volume like "V28.8" or "28.8L" or "28.8 Liters"
   * Captures: numeric volume value
   */
  volume: /[Vv]?(\d+(?:\.\d+)?)\s*[Ll]?(?:iters?)?/,

  /**
   * Alternative volume pattern from variant titles like "...V28.8 - Color"
   */
  volumeFromVariant: /[Vv](\d+(?:\.\d+)?)\s*[-–]/,
};

/**
 * Helper to infer category from tags and product type
 */
export function inferCategory(tags: string[], productType: string): SurfboardCategory {
  // First check product type
  const normalizedType = productType.trim();
  if (normalizedType in productTypeMapping) {
    return productTypeMapping[normalizedType];
  }

  // Then check tags
  const normalizedTags = tags.map((t) => t.toLowerCase().trim());
  for (const tag of normalizedTags) {
    if (tag in categoryTagMapping) {
      return categoryTagMapping[tag];
    }
  }

  // Default to "other" if no match
  return "other";
}

/**
 * Sleep function for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get random delay within rate limit bounds
 */
export function getRandomDelay(): number {
  const { minDelayMs, maxDelayMs } = scraperConfig.rateLimit;
  return Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
}
