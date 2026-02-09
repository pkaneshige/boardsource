/**
 * Product list scraper for hawaiiansouthshore.com
 *
 * Scrapes surfboard collection pages to get all product URLs and basic info.
 * Uses the Shopify JSON API for reliable data extraction.
 */

import { scraperConfig, urls, sleep, getRandomDelay } from "./config";
import type { ShopifyProductsResponse, ProductListItem } from "./types";

/**
 * Fetch a single page of products from a collection
 */
async function fetchCollectionPage(
  collectionHandle: string,
  page: number
): Promise<ShopifyProductsResponse> {
  const url = urls.collectionProducts(collectionHandle, page, scraperConfig.pagination.pageSize);

  const response = await fetch(url, {
    headers: scraperConfig.headers,
    signal: AbortSignal.timeout(scraperConfig.timeoutMs),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch collection page ${page}: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<ShopifyProductsResponse>;
}

/**
 * Convert a Shopify product to a ProductListItem
 */
function toProductListItem(product: ShopifyProductsResponse["products"][0]): ProductListItem {
  // Get minimum price from variants
  const prices = product.variants.map((v) => parseFloat(v.price));
  const minPrice = Math.min(...prices);

  return {
    url: urls.productPage(product.handle),
    name: product.title,
    price: minPrice,
    handle: product.handle,
  };
}

/**
 * Options for the list scraper
 */
export interface ListScraperOptions {
  /** Collection handle to scrape (default: "surfboards") */
  collection?: string;
  /** Maximum number of products to fetch (default: unlimited) */
  maxProducts?: number;
  /** Callback for progress updates */
  onProgress?: (fetched: number, page: number) => void;
}

/**
 * Scrape product listings from hawaiiansouthshore.com
 *
 * Fetches all surfboard products from the specified collection,
 * handling pagination automatically with rate limiting.
 *
 * @param options - Optional configuration for the scraper
 * @returns Array of ProductListItem objects with url, name, price, and handle
 */
export async function scrapeProductList(
  options: ListScraperOptions = {}
): Promise<ProductListItem[]> {
  const { collection = "surfboards", maxProducts, onProgress } = options;

  const products: ProductListItem[] = [];
  let page = 1;
  let hasMorePages = true;

  console.log(`Starting product list scrape from collection: ${collection}`);

  while (hasMorePages && page <= scraperConfig.pagination.maxPages) {
    // Rate limiting - wait before each request (except the first)
    if (page > 1) {
      const delay = getRandomDelay();
      console.log(`Rate limiting: waiting ${delay}ms before page ${page}`);
      await sleep(delay);
    }

    console.log(`Fetching page ${page}...`);

    try {
      const response = await fetchCollectionPage(collection, page);
      const pageProducts = response.products.map(toProductListItem);

      if (pageProducts.length === 0) {
        // No more products - we've reached the end
        hasMorePages = false;
        console.log(`No products on page ${page}, pagination complete`);
      } else {
        products.push(...pageProducts);
        console.log(
          `Fetched ${pageProducts.length} products from page ${page} (total: ${products.length})`
        );

        // Call progress callback if provided
        onProgress?.(products.length, page);

        // Check if we've reached the max products limit
        if (maxProducts && products.length >= maxProducts) {
          console.log(`Reached max products limit (${maxProducts})`);
          hasMorePages = false;
        }

        // If we got fewer than pageSize products, we've reached the end
        if (pageProducts.length < scraperConfig.pagination.pageSize) {
          hasMorePages = false;
          console.log(`Page ${page} has fewer products than limit, pagination complete`);
        }

        page++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching page ${page}: ${errorMessage}`);
      throw error;
    }
  }

  if (page > scraperConfig.pagination.maxPages) {
    console.warn(
      `Reached maximum page limit (${scraperConfig.pagination.maxPages}), some products may be missing`
    );
  }

  console.log(`Product list scrape complete. Total products: ${products.length}`);

  // Trim to maxProducts if specified
  if (maxProducts && products.length > maxProducts) {
    return products.slice(0, maxProducts);
  }

  return products;
}
