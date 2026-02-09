/**
 * TypeScript types for Squarespace JSON API responses
 *
 * Site Structure Analysis:
 * - Platform: Squarespace Commerce
 * - Collection URL pattern: /<collection-slug>?format=json
 * - Product detail URL pattern: /<collection-slug>/<product-id>?format=json
 * - JSON API available by appending ?format=json to any page URL
 *
 * Surfgarage Collections:
 * - /longboards - Longboards
 * - /shortboards - Shortboards
 * - /alternativeboards - Alternative boards (maps to "other" category)
 * - /guns - Gun boards
 * - /vintageboards - Vintage boards (maps to "other" category)
 */

/**
 * Squarespace image object from items array
 */
export interface SquarespaceImage {
  /** Unique image ID */
  id: string;

  /** Full asset URL for the image */
  assetUrl: string;

  /** Original image dimensions */
  originalSize: {
    width: number;
    height: number;
  };

  /** Alt text for the image */
  title?: string;

  /** Image format (e.g., "jpeg", "png") */
  format?: string;

  /** Media focal point for cropping */
  mediaFocalPoint?: {
    x: number;
    y: number;
  };
}

/**
 * Squarespace product variant
 */
export interface SquarespaceVariant {
  /** Unique variant ID */
  id: string;

  /** Variant SKU */
  sku: string;

  /** Price in cents (divide by 100 for dollars) */
  price: number;

  /** Compare-at price in cents (for sale items) */
  compareAtPrice?: number;

  /** Stock quantity (null if unlimited) */
  stock: number | null;

  /** Whether variant is available for purchase */
  unlimited: boolean;

  /** Variant attributes/options */
  attributes?: Record<string, string>;

  /** Sale price in cents (if on sale) */
  salePrice?: number;

  /** Whether variant is on sale */
  onSale?: boolean;
}

/**
 * Squarespace product item from collection response
 */
export interface SquarespaceProduct {
  /** Unique product ID */
  id: string;

  /** Product title */
  title: string;

  /** URL-friendly identifier (used in URLs) */
  urlId: string;

  /** Short description/excerpt (may contain HTML) */
  excerpt?: string;

  /** Full product description body (HTML) */
  body?: string;

  /** Product variants with pricing and stock */
  variants: SquarespaceVariant[];

  /** Product images */
  items?: SquarespaceImage[];

  /** Product tags/categories */
  tags?: string[];

  /** Product publish status */
  publishOn?: number;

  /** Product creation timestamp */
  addedOn?: number;

  /** Product update timestamp */
  updatedOn?: number;

  /** Whether the product is featured */
  starred?: boolean;

  /** Custom permalink if set */
  fullUrl?: string;

  /** SEO-friendly URL path */
  urlSlug?: string;

  /** Product type identifier */
  productType?: number;

  /** Vendor/brand name (if available) */
  author?: {
    displayName?: string;
  };
}

/**
 * Squarespace collection metadata
 */
export interface SquarespaceCollection {
  /** Collection ID */
  id: string;

  /** Collection title */
  title: string;

  /** Collection URL slug */
  urlId: string;

  /** Collection description */
  description?: string;

  /** Whether collection is enabled */
  enabled?: boolean;

  /** Collection type */
  type?: number;

  /** Number of items in collection */
  itemCount?: number;
}

/**
 * Squarespace collection page JSON response
 */
export interface SquarespaceCollectionResponse {
  /** Collection metadata */
  collection: SquarespaceCollection;

  /** Array of products in the collection */
  items: SquarespaceProduct[];

  /** Pagination info (if paginated) */
  pagination?: {
    nextPage?: boolean;
    nextPageOffset?: number;
    nextPageUrl?: string;
  };

  /** Website metadata */
  website?: {
    id: string;
    identifier: string;
    siteTitle?: string;
  };
}

/**
 * Squarespace single product page JSON response
 */
export interface SquarespaceProductResponse {
  /** The product item */
  item: SquarespaceProduct;

  /** Collection the product belongs to */
  collection: SquarespaceCollection;

  /** Website metadata */
  website?: {
    id: string;
    identifier: string;
    siteTitle?: string;
  };
}
