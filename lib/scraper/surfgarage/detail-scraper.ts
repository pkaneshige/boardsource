/**
 * Product detail scraper for surfgarage.squarespace.com
 *
 * Scrapes individual product pages to get full product details.
 * Uses the Squarespace JSON API for reliable data extraction.
 */

import {
  SURFGARAGE_TIMEOUT_MS,
  SURFGARAGE_SOURCE,
  SURFGARAGE_SOURCE_NAME,
  surfgarageHeaders,
  surfgarageUrls,
  mapCategory,
  sleep,
  getSurfgarageRandomDelay,
} from "./config";
import type { SurfgarageCategory } from "./config";
import type { SquarespaceProductResponse, SquarespaceProduct, ScrapedProduct } from "@/lib/scraper";

/**
 * Options for the Surfgarage detail scraper
 */
export interface SurfgarageDetailScraperOptions {
  /** Whether to skip rate limiting (useful when called in a batch with external rate limiting) */
  skipRateLimit?: boolean;
}

/**
 * Product info needed to fetch details
 */
export interface SurfgarageProductInfo {
  /** Category slug the product belongs to */
  category: SurfgarageCategory;
  /** Product URL identifier (urlId from Squarespace) */
  urlId: string;
}

/**
 * Fetch a single product from the Squarespace JSON API
 */
async function fetchProduct(
  category: SurfgarageCategory,
  urlId: string
): Promise<SquarespaceProductResponse> {
  const url = surfgarageUrls.getProductUrl(category, urlId);

  const response = await fetch(url, {
    headers: surfgarageHeaders,
    signal: AbortSignal.timeout(SURFGARAGE_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch product ${urlId} in category ${category}: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<SquarespaceProductResponse>;
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
 * Extract dimensions from product body/excerpt
 * Returns string like "5'4 x 20 13/16 x 2 1/4" or undefined
 */
function extractDimensions(body: string, excerpt: string): string | undefined {
  // Common dimension patterns for surfboards
  const dimensionPattern =
    /(\d+'?\d*(?:\s*[-\/]?\s*\d+)?["']?\s*[xX]\s*\d+(?:\s+\d+\/\d+)?\s*[xX]\s*\d+(?:\s+\d+\/\d+)?)/;

  // Try body first
  const bodyMatch = body.match(dimensionPattern);
  if (bodyMatch) {
    return bodyMatch[1].trim();
  }

  // Fallback to excerpt
  const excerptMatch = excerpt.match(dimensionPattern);
  if (excerptMatch) {
    return excerptMatch[1].trim();
  }

  return undefined;
}

/**
 * Extract volume from product body/excerpt
 * Returns string like "28.8" or undefined
 */
function extractVolume(body: string, excerpt: string): string | undefined {
  // Volume patterns: "28.8L", "28.8 liters", "V28.8", "volume: 28.8"
  const volumePatterns = [
    /(\d+(?:\.\d+)?)\s*[Ll](?:iters?)?/,
    /[Vv](?:olume)?[:\s]*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(?:liters?|litres?)/i,
  ];

  // Try body first
  for (const pattern of volumePatterns) {
    const match = body.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Fallback to excerpt
  for (const pattern of volumePatterns) {
    const match = excerpt.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Extract shaper/brand from product title
 * Surfgarage often formats titles as "SHAPER - MODEL" or "SHAPER MODEL"
 */
function extractVendor(title: string): string {
  // Try splitting on common separators
  const separators = [" - ", " – ", " | "];
  for (const sep of separators) {
    if (title.includes(sep)) {
      return title.split(sep)[0].trim();
    }
  }

  // Fallback: use first word(s) as vendor (common shaper names are 1-2 words)
  const words = title.split(" ");
  if (words.length >= 2) {
    // Check if second word looks like a model number/name
    const secondWord = words[1];
    if (/^\d/.test(secondWord) || secondWord.length <= 2) {
      return words[0];
    }
    // Otherwise, first two words might be the shaper
    return `${words[0]} ${words[1]}`;
  }

  return words[0] || "Unknown";
}

/**
 * Convert a Squarespace product to a ScrapedProduct
 */
function toScrapedProduct(
  squarespaceProduct: SquarespaceProduct,
  category: SurfgarageCategory
): ScrapedProduct {
  // Get prices from variants (Squarespace prices are in cents)
  const prices = squarespaceProduct.variants.map((v) => v.price / 100);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : undefined;

  // Check if any variant is available
  const available = squarespaceProduct.variants.some(
    (v) => v.unlimited || (v.stock !== null && v.stock > 0)
  );

  // Get image URLs from items array
  const imageUrls = (squarespaceProduct.items || []).map((img) => img.assetUrl);

  // Get description text
  const bodyHtml = squarespaceProduct.body || squarespaceProduct.excerpt || "";
  const description = stripHtml(bodyHtml);
  const excerptText = stripHtml(squarespaceProduct.excerpt || "");

  // Extract dimensions and volume
  const dimensions = extractDimensions(description, excerptText);
  const volume = extractVolume(description, excerptText);

  // Extract vendor/shaper from title
  const vendor = extractVendor(squarespaceProduct.title);

  // Map category to SurfboardCategory
  const surfboardCategory = mapCategory(category);

  // Generate unique source ID with prefix to avoid collisions
  const sourceId = `surfgarage-${squarespaceProduct.id}`;

  // Build source URL (human-readable, without ?format=json)
  const sourceUrl = surfgarageUrls.getProductPageUrl(category, squarespaceProduct.urlId);

  return {
    name: squarespaceProduct.title,
    handle: squarespaceProduct.urlId,
    shopifyId: 0, // Not applicable for Squarespace
    price: minPrice,
    maxPrice: maxPrice !== minPrice ? maxPrice : undefined,
    imageUrls,
    vendor,
    productType: category, // Use category as product type
    descriptionHtml: bodyHtml,
    description,
    tags: squarespaceProduct.tags || [],
    dimensions,
    volume,
    sourceUrl,
    sourceId,
    available,
    category: surfboardCategory,
    stockStatus: available ? "in_stock" : "out_of_stock",
    source: SURFGARAGE_SOURCE,
    sourceName: SURFGARAGE_SOURCE_NAME,
    scrapedAt: new Date(),
  };
}

/**
 * Scrape full product details for a single Surfgarage product
 *
 * @param productInfo - Product category and urlId to fetch
 * @param options - Optional configuration
 * @returns ScrapedProduct with all available details, or null if the product cannot be fetched
 */
export async function scrapeSurfgarageDetail(
  productInfo: SurfgarageProductInfo,
  options: SurfgarageDetailScraperOptions = {}
): Promise<ScrapedProduct | null> {
  const { skipRateLimit = false } = options;
  const { category, urlId } = productInfo;

  console.log(`Scraping Surfgarage product details for: ${category}/${urlId}`);

  // Apply rate limiting unless skipped
  if (!skipRateLimit) {
    const delay = getSurfgarageRandomDelay();
    console.log(`Rate limiting: waiting ${delay}ms`);
    await sleep(delay);
  }

  try {
    const response = await fetchProduct(category, urlId);
    const scrapedProduct = toScrapedProduct(response.item, category);
    console.log(`Successfully scraped: ${scrapedProduct.name}`);
    return scrapedProduct;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to scrape Surfgarage product ${category}/${urlId}: ${errorMessage}`);
    return null;
  }
}

/**
 * Scrape multiple Surfgarage products with rate limiting
 *
 * @param products - Array of product info objects with category and urlId
 * @param onProgress - Optional callback for progress updates
 * @returns Array of ScrapedProduct (null entries for failed products are filtered out)
 */
export async function scrapeSurfgarageDetails(
  products: SurfgarageProductInfo[],
  onProgress?: (completed: number, total: number, product: ScrapedProduct | null) => void
): Promise<ScrapedProduct[]> {
  const results: ScrapedProduct[] = [];
  const total = products.length;

  console.log(`Starting batch scrape of ${total} Surfgarage products`);

  for (let i = 0; i < products.length; i++) {
    const productInfo = products[i];

    // Rate limiting between requests (except the first)
    if (i > 0) {
      const delay = getSurfgarageRandomDelay();
      console.log(`Rate limiting: waiting ${delay}ms before product ${i + 1}/${total}`);
      await sleep(delay);
    }

    const product = await scrapeSurfgarageDetail(productInfo, { skipRateLimit: true });
    if (product) {
      results.push(product);
    }

    onProgress?.(i + 1, total, product);
  }

  console.log(`Batch scrape complete. Successfully scraped ${results.length}/${total} products`);
  return results;
}
