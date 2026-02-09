/**
 * Product detail scraper for hawaiiansouthshore.com
 *
 * Scrapes individual product pages to get full product details.
 * Uses the Shopify JSON API for reliable data extraction.
 */

import { scraperConfig, urls, inferCategory, parsePatterns, sleep, getRandomDelay } from "./config";
import type { ScrapedProduct, ShopifyProduct } from "./types";
import { parseDimensionString, parseVolumeString } from "@/lib/utils/parse-dimensions";

/**
 * Shopify single product JSON API response
 */
interface ShopifyProductResponse {
  product: ShopifyProduct;
}

/**
 * Fetch a single product by handle from the Shopify JSON API
 */
async function fetchProduct(handle: string): Promise<ShopifyProduct> {
  const url = urls.product(handle);

  // Create abort controller for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), scraperConfig.timeoutMs);

  try {
    const response = await fetch(url, {
      headers: scraperConfig.headers,
      signal: controller.signal,
      cache: "no-store", // Disable Next.js fetch caching
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch product ${handle}: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as ShopifyProductResponse;
    return data.product;
  } finally {
    clearTimeout(timeoutId);
  }
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
 * Extract dimensions from variant titles or description
 * Returns string like "5'4 x 20 13/16 x 2 1/4" or undefined
 */
function extractDimensions(
  variants: ShopifyProduct["variants"],
  description: string
): string | undefined {
  // First try to extract from variant titles
  for (const variant of variants) {
    const match = variant.title.match(parsePatterns.dimensions);
    if (match) {
      return match[1].trim();
    }
  }

  // Fallback to description
  const descMatch = description.match(parsePatterns.dimensions);
  if (descMatch) {
    return descMatch[1].trim();
  }

  return undefined;
}

/**
 * Extract volume from variant titles or description
 * Returns string like "28.8" or undefined
 */
function extractVolume(
  variants: ShopifyProduct["variants"],
  description: string
): string | undefined {
  // First try to extract from variant titles using V prefix pattern
  for (const variant of variants) {
    const match = variant.title.match(parsePatterns.volumeFromVariant);
    if (match) {
      return match[1];
    }
  }

  // Try the general volume pattern on variant titles
  for (const variant of variants) {
    // Look for volume indicators in the title
    if (/[Vv]\d+(\.\d+)?/.test(variant.title)) {
      const match = variant.title.match(/[Vv](\d+(?:\.\d+)?)/);
      if (match) {
        return match[1];
      }
    }
  }

  // Fallback to description
  const descMatch = description.match(parsePatterns.volume);
  if (descMatch) {
    return descMatch[1];
  }

  return undefined;
}

/**
 * Convert a Shopify product to a ScrapedProduct
 */
function toScrapedProduct(shopifyProduct: ShopifyProduct): ScrapedProduct {
  // Get prices from variants
  const prices = shopifyProduct.variants.map((v) => parseFloat(v.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Check if any variant is available
  const available = shopifyProduct.variants.some((v) => v.available);

  // Get image URLs
  const imageUrls = shopifyProduct.images.map((img) => img.src);

  // Strip HTML for plain text description
  const description = stripHtml(shopifyProduct.body_html);

  // Extract dimensions and volume
  const dimensions = extractDimensions(shopifyProduct.variants, description);
  const volume = extractVolume(shopifyProduct.variants, description);

  // Convert tags from comma-separated string to array
  const tags = shopifyProduct.tags ? shopifyProduct.tags.split(",").map((t) => t.trim()) : [];

  // Infer category from tags and product type
  const category = inferCategory(tags, shopifyProduct.product_type);

  return {
    name: shopifyProduct.title,
    handle: shopifyProduct.handle,
    shopifyId: shopifyProduct.id,
    price: minPrice,
    maxPrice: maxPrice !== minPrice ? maxPrice : undefined,
    imageUrls,
    vendor: shopifyProduct.vendor,
    productType: shopifyProduct.product_type,
    descriptionHtml: shopifyProduct.body_html,
    description,
    tags,
    dimensions,
    volume,
    ...(dimensions ? (() => { const p = parseDimensionString(dimensions); return p ? { lengthFeet: p.lengthFeet, lengthInches: p.lengthInches, widthInches: p.widthInches ?? undefined, thicknessInches: p.thicknessInches ?? undefined } : {}; })() : {}),
    ...(volume ? (() => { const v = parseVolumeString(volume); return v != null ? { volumeLiters: v } : {}; })() : {}),
    sourceUrl: urls.productPage(shopifyProduct.handle),
    sourceId: String(shopifyProduct.id),
    available,
    category,
    stockStatus: available ? "in_stock" : "out_of_stock",
    source: "hawaiian-south-shore",
    sourceName: "Hawaiian South Shore",
    scrapedAt: new Date(),
  };
}

/**
 * Options for the detail scraper
 */
export interface DetailScraperOptions {
  /** Whether to skip rate limiting (useful when called in a batch with external rate limiting) */
  skipRateLimit?: boolean;
}

/**
 * Scrape full product details for a single product
 *
 * Accepts either a product URL or handle and returns complete ScrapedProduct data.
 *
 * @param urlOrHandle - Product URL (e.g., "https://www.hawaiiansouthshore.com/products/firewire-board") or handle (e.g., "firewire-board")
 * @param options - Optional configuration
 * @returns ScrapedProduct with all available details, or null if the product cannot be fetched
 */
export async function scrapeProductDetail(
  urlOrHandle: string,
  options: DetailScraperOptions = {}
): Promise<ScrapedProduct | null> {
  const { skipRateLimit = false } = options;

  // Extract handle from URL if full URL provided
  let handle = urlOrHandle;
  if (urlOrHandle.includes("/products/")) {
    const match = urlOrHandle.match(/\/products\/([^/?#]+)/);
    if (match) {
      handle = match[1];
    }
  }

  console.log(`Scraping product details for: ${handle}`);

  // Apply rate limiting unless skipped
  if (!skipRateLimit) {
    const delay = getRandomDelay();
    console.log(`Rate limiting: waiting ${delay}ms`);
    await sleep(delay);
  }

  try {
    const shopifyProduct = await fetchProduct(handle);
    const scrapedProduct = toScrapedProduct(shopifyProduct);
    console.log(`Successfully scraped: ${scrapedProduct.name}`);
    return scrapedProduct;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to scrape product ${handle}: ${errorMessage}`);
    return null;
  }
}

/**
 * Scrape multiple products with rate limiting
 *
 * @param handles - Array of product handles or URLs
 * @param onProgress - Optional callback for progress updates
 * @returns Array of ScrapedProduct (null entries for failed products are filtered out)
 */
export async function scrapeProductDetails(
  handles: string[],
  onProgress?: (completed: number, total: number, product: ScrapedProduct | null) => void
): Promise<ScrapedProduct[]> {
  const results: ScrapedProduct[] = [];
  const total = handles.length;

  console.log(`Starting batch scrape of ${total} products`);

  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i];

    // Rate limiting between requests (except the first)
    if (i > 0) {
      const delay = getRandomDelay();
      console.log(`Rate limiting: waiting ${delay}ms before product ${i + 1}/${total}`);
      await sleep(delay);
    }

    const product = await scrapeProductDetail(handle, { skipRateLimit: true });
    if (product) {
      results.push(product);
    }

    onProgress?.(i + 1, total, product);
  }

  console.log(`Batch scrape complete. Successfully scraped ${results.length}/${total} products`);
  return results;
}
