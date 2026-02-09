/**
 * TypeScript types for scraped surfboard data from hawaiiansouthshore.com
 *
 * Site Structure Analysis:
 * - Platform: Shopify (hawaiiansouthshore.myshopify.com)
 * - Product list URL pattern: /collections/{collection-handle} (e.g., /collections/surfboards)
 * - Product detail URL pattern: /products/{product-handle}
 * - JSON API available: /collections/{handle}/products.json and /products.json
 * - Pagination: Shopify standard ?page=N&limit=N (default limit 30, max 250)
 *
 * Collections available:
 * - /collections/surfboards - All surfboards
 * - /collections/shortboards - Shortboards
 * - /collections/funboard - Funboards/Mid-length
 * - /collections/shop-longboards-surfboards-honolulu-hawaii - Longboards
 * - Brand-specific collections (e.g., /collections/firewire)
 */

import type { SurfboardCategory, StockStatus, SurfboardSource } from "@/types";

/**
 * Product data as scraped from Shopify JSON API
 */
export interface ScrapedProduct {
  /** Product title from Shopify */
  name: string;

  /** Product handle used in URLs (e.g., "firewire-machadocado-52-62-futures-helium-2-surfboard") */
  handle: string;

  /** Shopify product ID */
  shopifyId: number;

  /** Price in USD (from the default/first variant, or minimum price) */
  price: number;

  /** Maximum price if variants have different prices */
  maxPrice?: number;

  /** Array of image URLs */
  imageUrls: string[];

  /** Vendor/brand name (e.g., "FIREWIRE") */
  vendor: string;

  /** Product type from Shopify (may help categorize) */
  productType: string;

  /** Full HTML description from body_html field */
  descriptionHtml: string;

  /** Plain text description (HTML stripped) */
  description: string;

  /** Tags array for categorization */
  tags: string[];

  /** Dimensions string parsed from title/description (e.g., "5'4 x 20 13/16 x 2 1/4") */
  dimensions?: string;

  /** Volume in liters parsed from title/description (e.g., "28.8") */
  volume?: string;

  /** Full source URL to the product page */
  sourceUrl: string;

  /** Unique source identifier (Shopify product ID as string) */
  sourceId: string;

  /** Whether any variant is available for purchase */
  available: boolean;

  /** Inferred board category based on tags/collections/product type */
  category: SurfboardCategory;

  /** Stock status derived from availability */
  stockStatus: StockStatus;

  /** Source vendor identifier (e.g., "hawaiian-south-shore", "surfgarage") */
  source: SurfboardSource;

  /** Display name of the source vendor (e.g., "Hawaiian South Shore") */
  sourceName: string;

  /** Timestamp when this data was scraped */
  scrapedAt: Date;
}

/**
 * Shopify product variant from JSON API
 */
export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string;
  available: boolean;
  grams: number;
  requires_shipping: boolean;
  taxable: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Shopify product image from JSON API
 */
export interface ShopifyImage {
  id: number;
  product_id: number;
  src: string;
  position: number;
  alt: string | null;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

/**
 * Shopify product as returned from JSON API
 */
export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  /** Tags as comma-separated string (Shopify JSON API format) */
  tags: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  options: Array<{
    id: number;
    product_id: number;
    name: string;
    position: number;
    values: string[];
  }>;
}

/**
 * Shopify products.json API response
 */
export interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

/**
 * Basic product info from list scraping (before full details)
 */
export interface ProductListItem {
  url: string;
  name: string;
  price: number;
  handle: string;
}

/**
 * Sync result summary
 */
export interface SyncResult {
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ handle: string; error: string }>;
}
