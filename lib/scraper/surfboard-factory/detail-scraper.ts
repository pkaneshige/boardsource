/**
 * Product detail scraper for surfboardfactoryhawaii.com
 *
 * Converts WooCommerce product data to ScrapedProduct format.
 * Since the WooCommerce Store API returns full product data in the list response,
 * this scraper can work with either:
 * 1. A WooCommerceProduct already fetched from the list
 * 2. A product ID to fetch fresh from the API
 */

import {
  SURFBOARD_FACTORY_TIMEOUT_MS,
  SURFBOARD_FACTORY_SOURCE,
  SURFBOARD_FACTORY_SOURCE_NAME,
  surfboardFactoryHeaders,
  surfboardFactoryUrls,
  mapCategory,
  parseWooCommercePrice,
  generateSourceId,
  sleep,
  getSurfboardFactoryRandomDelay,
} from "./config";
import type { WooCommerceProduct, WooCommerceAttribute } from "./types";
import type { ScrapedProduct } from "@/lib/scraper";
import { parseDimensionString, parseVolumeString } from "@/lib/utils/parse-dimensions";

/**
 * Options for the Surfboard Factory detail scraper
 */
export interface SurfboardFactoryDetailScraperOptions {
  /** Whether to skip rate limiting (useful when called in a batch with external rate limiting) */
  skipRateLimit?: boolean;
}

/**
 * Fetch a single product from the WooCommerce Store API by ID
 */
async function fetchProductById(productId: number): Promise<WooCommerceProduct> {
  const url = surfboardFactoryUrls.getProductUrl(productId);

  const response = await fetch(url, {
    headers: surfboardFactoryHeaders,
    signal: AbortSignal.timeout(SURFBOARD_FACTORY_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch product ${productId}: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<WooCommerceProduct>;
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ") // Replace tags with spaces
    .replace(/&nbsp;/g, " ") // Replace &nbsp; with spaces
    .replace(/&amp;/g, "&") // Decode common entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Extract a specific attribute value from WooCommerce attributes
 * @param attributes - Product attributes array
 * @param attributeName - Name of the attribute to find (case-insensitive)
 * @returns The first term value or undefined if not found
 */
function getAttributeValue(
  attributes: WooCommerceAttribute[],
  attributeName: string
): string | undefined {
  const attr = attributes.find((a) => a.name.toLowerCase() === attributeName.toLowerCase());
  if (attr && attr.terms.length > 0) {
    return attr.terms[0].name;
  }
  return undefined;
}

/**
 * Extract dimensions from product attributes or description
 * WooCommerce may have Length attribute, or dimensions in description
 * Returns string like "5'4 x 20 13/16 x 2 1/4" or undefined
 */
function extractDimensions(
  attributes: WooCommerceAttribute[],
  description: string
): string | undefined {
  // Try to get from Length attribute first
  const length = getAttributeValue(attributes, "Length");
  if (length) {
    return length;
  }

  // Try to extract from description using common patterns
  const dimensionPattern =
    /(\d+'?\d*(?:\s*[-\/]?\s*\d+)?["']?\s*[xX]\s*\d+(?:\s+\d+\/\d+)?\s*[xX]\s*\d+(?:\s+\d+\/\d+)?)/;
  const match = description.match(dimensionPattern);
  if (match) {
    return match[1].trim();
  }

  return undefined;
}

/**
 * Extract volume from product attributes or description
 * Returns string like "28.8" or undefined
 */
function extractVolume(
  attributes: WooCommerceAttribute[],
  description: string
): string | undefined {
  // Try to get from Volume attribute first
  const volume = getAttributeValue(attributes, "Volume");
  if (volume) {
    // Clean up the volume string (remove "L" suffix if present)
    const cleaned = volume.replace(/\s*[Ll](?:iters?)?$/, "").trim();
    return cleaned;
  }

  // Try to extract from description
  const volumePatterns = [
    /(\d+(?:\.\d+)?)\s*[Ll](?:iters?)?/,
    /[Vv](?:olume)?[:\s]*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(?:liters?|litres?)/i,
  ];

  for (const pattern of volumePatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Extract vendor/brand from product data
 * First checks brands array, then falls back to parsing the title
 */
function extractVendor(product: WooCommerceProduct): string {
  // First try to get from brands
  if (product.brands && product.brands.length > 0) {
    return product.brands[0].name;
  }

  // Fallback: parse from title (often formatted as "BRAND - MODEL" or "BRAND MODEL")
  const title = product.name;
  const separators = [" - ", " – ", " | "];
  for (const sep of separators) {
    if (title.includes(sep)) {
      return title.split(sep)[0].trim();
    }
  }

  // Fallback: use first word(s) as vendor
  const words = title.split(" ");
  if (words.length >= 2) {
    const secondWord = words[1];
    if (/^\d/.test(secondWord) || secondWord.length <= 2) {
      return words[0];
    }
    return `${words[0]} ${words[1]}`;
  }

  return words[0] || "Unknown";
}

/**
 * Determine the surfboard category from product categories
 */
function determineSurfboardCategory(product: WooCommerceProduct): string {
  // Find the most specific category (non-parent)
  for (const category of product.categories) {
    const mapped = mapCategory(category.slug);
    if (mapped !== "other") {
      return mapped;
    }
  }

  // Default to "other" if no specific category found
  return "other";
}

/**
 * Convert a WooCommerce product to a ScrapedProduct
 */
function toScrapedProduct(product: WooCommerceProduct): ScrapedProduct {
  // Parse price from minor units (cents) to dollars
  const price = parseWooCommercePrice(product.prices.price);

  // Handle variable products with price ranges
  let maxPrice: number | undefined;
  if (product.prices.price_range) {
    const maxAmount = parseWooCommercePrice(product.prices.price_range.max_amount);
    if (maxAmount > price) {
      maxPrice = maxAmount;
    }
  }

  // Get image URLs
  const imageUrls = product.images.map((img) => img.src);

  // Get description
  const descriptionHtml = product.description || product.short_description || "";
  const description = stripHtml(descriptionHtml);

  // Extract specs from attributes and description
  const dimensions = extractDimensions(product.attributes, description);
  const volume = extractVolume(product.attributes, description);

  // Get vendor/brand
  const vendor = extractVendor(product);

  // Map category
  const category = determineSurfboardCategory(product);

  // Generate unique source ID
  const sourceId = generateSourceId(product.id);

  // Determine availability
  const available = product.is_in_stock && product.is_purchasable;

  // Get tags (WooCommerce tags have same structure as categories)
  const tags = product.tags ? product.tags.map((t) => t.name) : [];

  return {
    name: product.name,
    handle: product.slug,
    shopifyId: 0, // Not applicable for WooCommerce
    price,
    maxPrice,
    imageUrls,
    vendor,
    productType: product.type,
    descriptionHtml,
    description,
    tags,
    dimensions,
    volume,
    ...(dimensions ? (() => { const p = parseDimensionString(dimensions); return p ? { lengthFeet: p.lengthFeet, lengthInches: p.lengthInches, widthInches: p.widthInches ?? undefined, thicknessInches: p.thicknessInches ?? undefined } : {}; })() : {}),
    ...(volume ? (() => { const v = parseVolumeString(volume); return v != null ? { volumeLiters: v } : {}; })() : {}),
    sourceUrl: product.permalink,
    sourceId,
    available,
    category: category as ScrapedProduct["category"],
    stockStatus: available ? "in_stock" : "out_of_stock",
    source: SURFBOARD_FACTORY_SOURCE,
    sourceName: SURFBOARD_FACTORY_SOURCE_NAME,
    scrapedAt: new Date(),
  };
}

/**
 * Scrape full product details for a single Surfboard Factory product
 *
 * @param productOrId - Either a WooCommerceProduct object or a product ID to fetch
 * @param options - Optional configuration
 * @returns ScrapedProduct with all available details, or null if the product cannot be fetched
 */
export async function scrapeSurfboardFactoryDetail(
  productOrId: WooCommerceProduct | number,
  options: SurfboardFactoryDetailScraperOptions = {}
): Promise<ScrapedProduct | null> {
  const { skipRateLimit = false } = options;

  // If we received a product ID, we need to fetch the product first
  let product: WooCommerceProduct;
  if (typeof productOrId === "number") {
    console.log(`Fetching Surfboard Factory product details for ID: ${productOrId}`);

    // Apply rate limiting unless skipped
    if (!skipRateLimit) {
      const delay = getSurfboardFactoryRandomDelay();
      console.log(`Rate limiting: waiting ${delay}ms`);
      await sleep(delay);
    }

    try {
      product = await fetchProductById(productOrId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to fetch Surfboard Factory product ${productOrId}: ${errorMessage}`);
      return null;
    }
  } else {
    // We already have the full product data
    product = productOrId;
  }

  try {
    const scrapedProduct = toScrapedProduct(product);
    console.log(`Successfully scraped: ${scrapedProduct.name}`);
    return scrapedProduct;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Failed to convert Surfboard Factory product ${product.id} (${product.name}): ${errorMessage}`
    );
    return null;
  }
}

/**
 * Scrape multiple Surfboard Factory products with rate limiting
 *
 * @param productsOrIds - Array of WooCommerceProduct objects or product IDs
 * @param onProgress - Optional callback for progress updates
 * @returns Array of ScrapedProduct (null entries for failed products are filtered out)
 */
export async function scrapeSurfboardFactoryDetails(
  productsOrIds: (WooCommerceProduct | number)[],
  onProgress?: (completed: number, total: number, product: ScrapedProduct | null) => void
): Promise<ScrapedProduct[]> {
  const results: ScrapedProduct[] = [];
  const total = productsOrIds.length;

  console.log(`Starting batch scrape of ${total} Surfboard Factory products`);

  for (let i = 0; i < productsOrIds.length; i++) {
    const productOrId = productsOrIds[i];

    // Rate limiting between requests (except the first) only when fetching by ID
    if (i > 0 && typeof productOrId === "number") {
      const delay = getSurfboardFactoryRandomDelay();
      console.log(`Rate limiting: waiting ${delay}ms before product ${i + 1}/${total}`);
      await sleep(delay);
    }

    const product = await scrapeSurfboardFactoryDetail(productOrId, { skipRateLimit: true });
    if (product) {
      results.push(product);
    }

    onProgress?.(i + 1, total, product);
  }

  console.log(`Batch scrape complete. Successfully scraped ${results.length}/${total} products`);
  return results;
}
