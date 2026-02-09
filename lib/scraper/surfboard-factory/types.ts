/**
 * TypeScript types for WooCommerce Store API v1 responses
 * Used for scraping surfboardfactoryhawaii.com
 *
 * API Documentation: WooCommerce Store API v1
 * Endpoint: /wp-json/wc/store/v1/products
 */

/**
 * WooCommerce product image from Store API
 */
export interface WooCommerceImage {
  /** Image ID */
  id: number;

  /** Full image URL */
  src: string;

  /** Thumbnail URL */
  thumbnail: string;

  /** Srcset for responsive images */
  srcset: string;

  /** Sizes attribute */
  sizes: string;

  /** Image name/filename */
  name: string;

  /** Alt text for accessibility */
  alt: string;
}

/**
 * WooCommerce product category from Store API
 */
export interface WooCommerceCategory {
  /** Category ID */
  id: number;

  /** Category display name */
  name: string;

  /** Category URL slug */
  slug: string;
}

/**
 * WooCommerce brand from Store API
 */
export interface WooCommerceBrand {
  /** Brand ID */
  id: number;

  /** Brand display name */
  name: string;

  /** Brand URL slug */
  slug: string;
}

/**
 * WooCommerce price information from Store API
 * Note: Prices are returned in minor units (cents)
 */
export interface WooCommercePrices {
  /** Price in minor units (e.g., "72500" = $725.00) */
  price: string;

  /** Regular price in minor units */
  regular_price: string;

  /** Sale price in minor units (empty string if not on sale) */
  sale_price: string;

  /** Price range for variable products */
  price_range: {
    min_amount: string;
    max_amount: string;
  } | null;

  /** Currency code (e.g., "USD") */
  currency_code: string;

  /** Number of decimal places (e.g., 2 for cents) */
  currency_minor_unit: number;

  /** Currency symbol (e.g., "$") */
  currency_symbol: string;

  /** Currency prefix */
  currency_prefix: string;

  /** Currency suffix */
  currency_suffix: string;

  /** Currency decimal separator */
  currency_decimal_separator: string;

  /** Currency thousands separator */
  currency_thousand_separator: string;
}

/**
 * WooCommerce product attribute from Store API
 */
export interface WooCommerceAttribute {
  /** Attribute ID */
  id: number;

  /** Attribute name (e.g., "Length", "Volume") */
  name: string;

  /** Attribute taxonomy/slug */
  taxonomy: string;

  /** Whether attribute has archives */
  has_variations: boolean;

  /** Attribute terms/values */
  terms: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

/**
 * WooCommerce product from Store API v1
 */
export interface WooCommerceProduct {
  /** Product ID */
  id: number;

  /** Product name/title */
  name: string;

  /** URL slug */
  slug: string;

  /** Parent product ID (for variations) */
  parent: number;

  /** Product type (simple, variable, etc.) */
  type: string;

  /** Product permalink/URL */
  permalink: string;

  /** SKU */
  sku: string;

  /** Short description HTML */
  short_description: string;

  /** Full description HTML */
  description: string;

  /** Whether product is on sale */
  on_sale: boolean;

  /** Price information */
  prices: WooCommercePrices;

  /** Product images */
  images: WooCommerceImage[];

  /** Product categories */
  categories: WooCommerceCategory[];

  /** Product brands */
  brands: WooCommerceBrand[];

  /** Product tags */
  tags: WooCommerceCategory[];

  /** Product attributes (dimensions, volume, etc.) */
  attributes: WooCommerceAttribute[];

  /** Whether product has stock */
  has_options: boolean;

  /** Whether product is purchasable */
  is_purchasable: boolean;

  /** Whether product is in stock */
  is_in_stock: boolean;

  /** Whether product is on backorder */
  is_on_backorder: boolean;

  /** Low stock remaining amount */
  low_stock_remaining: number | null;

  /** Sold individually flag */
  sold_individually: boolean;

  /** Average rating */
  average_rating: string;

  /** Review count */
  review_count: number;
}

/**
 * WooCommerce products list response with pagination info
 */
export interface WooCommerceProductsResponse {
  /** Array of products */
  products: WooCommerceProduct[];

  /** Total number of products (from X-WP-Total header) */
  total: number;

  /** Total number of pages (from X-WP-TotalPages header) */
  totalPages: number;
}

/**
 * WooCommerce category from categories endpoint
 */
export interface WooCommerceCategoryInfo {
  /** Category ID */
  id: number;

  /** Category name */
  name: string;

  /** Category slug */
  slug: string;

  /** Parent category ID (0 if top-level) */
  parent: number;

  /** Number of products in category */
  count: number;
}
