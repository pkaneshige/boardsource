/**
 * Product list scraper for surfgarage.squarespace.com
 *
 * Scrapes surfboard collection pages to get all product URLs and basic info.
 * Uses the Squarespace JSON API for reliable data extraction.
 */

import {
  SURFGARAGE_CATEGORIES,
  SURFGARAGE_TIMEOUT_MS,
  surfgarageHeaders,
  surfgarageUrls,
  sleep,
  getSurfgarageRandomDelay,
} from "./config";
import type { SurfgarageCategory } from "./config";
import type { SquarespaceCollectionResponse, ProductListItem } from "@/lib/scraper";

/**
 * Options for the Surfgarage list scraper
 */
export interface SurfgarageListScraperOptions {
  /** Specific category to scrape (default: all categories) */
  category?: SurfgarageCategory;
  /** Maximum number of products to fetch (default: unlimited) */
  maxProducts?: number;
  /** Callback for progress updates */
  onProgress?: (fetched: number, category: string) => void;
}

/**
 * Fetch products from a single Squarespace collection/category
 */
async function fetchCategoryProducts(
  category: SurfgarageCategory
): Promise<SquarespaceCollectionResponse> {
  const url = surfgarageUrls.getCategoryUrl(category);

  const response = await fetch(url, {
    headers: surfgarageHeaders,
    signal: AbortSignal.timeout(SURFGARAGE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch category ${category}: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<SquarespaceCollectionResponse>;
}

/**
 * Convert a Squarespace product to a ProductListItem
 */
function toProductListItem(
  product: SquarespaceCollectionResponse["items"][0],
  category: SurfgarageCategory
): ProductListItem {
  // Get minimum price from variants (Squarespace prices are in cents)
  const prices = product.variants.map((v) => v.price / 100);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

  return {
    url: surfgarageUrls.getProductPageUrl(category, product.urlId),
    name: product.title,
    price: minPrice,
    handle: product.urlId,
  };
}

/**
 * Scrape products from a single category
 *
 * @param category - Category slug to scrape
 * @param onProgress - Optional progress callback
 * @returns Array of ProductListItem objects
 */
async function scrapeCategoryProducts(
  category: SurfgarageCategory,
  onProgress?: (fetched: number, category: string) => void
): Promise<ProductListItem[]> {
  console.log(`Fetching products from category: ${category}`);

  try {
    const response = await fetchCategoryProducts(category);
    const products = response.items.map((item) => toProductListItem(item, category));

    console.log(`Found ${products.length} products in category ${category}`);
    onProgress?.(products.length, category);

    return products;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching category ${category}: ${errorMessage}`);
    // Log error and continue with other categories
    return [];
  }
}

/**
 * Scrape product listings from surfgarage.squarespace.com
 *
 * Fetches all surfboard products from specified or all categories,
 * with rate limiting between category requests.
 *
 * @param options - Optional configuration for the scraper
 * @returns Array of ProductListItem objects with url, name, price, and handle
 */
export async function scrapeSurfgarageList(
  options: SurfgarageListScraperOptions = {}
): Promise<ProductListItem[]> {
  const { category, maxProducts, onProgress } = options;

  // Determine which categories to scrape
  const categoriesToScrape: SurfgarageCategory[] = category
    ? [category]
    : [...SURFGARAGE_CATEGORIES];

  const allProducts: ProductListItem[] = [];

  console.log(`Starting Surfgarage list scrape for categories: ${categoriesToScrape.join(", ")}`);

  for (let i = 0; i < categoriesToScrape.length; i++) {
    const currentCategory = categoriesToScrape[i];

    // Rate limiting - wait before each request (except the first)
    if (i > 0) {
      const delay = getSurfgarageRandomDelay();
      console.log(`Rate limiting: waiting ${delay}ms before category ${currentCategory}`);
      await sleep(delay);
    }

    const categoryProducts = await scrapeCategoryProducts(currentCategory, onProgress);
    allProducts.push(...categoryProducts);

    // Check if we've reached the max products limit
    if (maxProducts && allProducts.length >= maxProducts) {
      console.log(`Reached max products limit (${maxProducts})`);
      break;
    }
  }

  console.log(`Surfgarage list scrape complete. Total products: ${allProducts.length}`);

  // Trim to maxProducts if specified
  if (maxProducts && allProducts.length > maxProducts) {
    return allProducts.slice(0, maxProducts);
  }

  return allProducts;
}
