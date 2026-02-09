/**
 * Product list scraper for surfboardfactoryhawaii.com
 *
 * Scrapes surfboard products using WooCommerce Store API v1.
 * Handles pagination and rate limiting between requests.
 */

import {
  SURFBOARD_FACTORY_CATEGORY_IDS,
  SURFBOARD_FACTORY_TIMEOUT_MS,
  surfboardFactoryHeaders,
  surfboardFactoryUrls,
  surfboardFactoryPagination,
  parseWooCommercePrice,
  sleep,
  getSurfboardFactoryRandomDelay,
} from "./config";
import type { WooCommerceProduct } from "./types";
import type { ProductListItem } from "@/lib/scraper";

/**
 * Options for the Surfboard Factory list scraper
 */
export interface SurfboardFactoryListScraperOptions {
  /** Specific category ID to scrape (default: surfboards parent category) */
  categoryId?: number;
  /** Maximum number of products to fetch (default: unlimited) */
  maxProducts?: number;
  /** Products per page (default: 24) */
  perPage?: number;
  /** Callback for progress updates */
  onProgress?: (fetched: number, total: number, page: number) => void;
}

/**
 * Response from WooCommerce Store API with pagination info from headers
 */
interface WooCommercePaginatedResponse {
  products: WooCommerceProduct[];
  total: number;
  totalPages: number;
}

/**
 * Fetch a page of products from WooCommerce Store API
 */
async function fetchProductsPage(
  page: number,
  perPage: number,
  categoryId?: number
): Promise<WooCommercePaginatedResponse> {
  const url = categoryId
    ? surfboardFactoryUrls.getProductsByCategoryUrl(categoryId, page, perPage)
    : surfboardFactoryUrls.getProductsUrl(page, perPage);

  const response = await fetch(url, {
    headers: surfboardFactoryHeaders,
    signal: AbortSignal.timeout(SURFBOARD_FACTORY_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch products page ${page}: ${response.status} ${response.statusText}`
    );
  }

  // Get pagination info from headers
  const total = parseInt(response.headers.get("X-WP-Total") || "0", 10);
  const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "0", 10);

  const products = (await response.json()) as WooCommerceProduct[];

  return { products, total, totalPages };
}

/**
 * Convert a WooCommerce product to a ProductListItem
 */
function toProductListItem(product: WooCommerceProduct): ProductListItem {
  // Parse price from minor units (cents) to dollars
  const price = parseWooCommercePrice(product.prices.price);

  return {
    url: product.permalink,
    name: product.name,
    price,
    handle: product.slug,
  };
}

/**
 * Scrape product listings from surfboardfactoryhawaii.com
 *
 * Fetches all surfboard products from the WooCommerce Store API,
 * handling pagination with rate limiting between page requests.
 *
 * @param options - Optional configuration for the scraper
 * @returns Array of ProductListItem objects with url, name, price, and handle
 */
export async function scrapeSurfboardFactoryList(
  options: SurfboardFactoryListScraperOptions = {}
): Promise<ProductListItem[]> {
  const {
    categoryId = SURFBOARD_FACTORY_CATEGORY_IDS.surfboards,
    maxProducts,
    perPage = surfboardFactoryPagination.perPage,
    onProgress,
  } = options;

  const allProducts: ProductListItem[] = [];
  let currentPage = 1;
  let totalPages = 1;
  let totalProducts = 0;

  console.log(
    `Starting Surfboard Factory list scrape${categoryId ? ` for category ${categoryId}` : ""}`
  );

  // Fetch first page to get pagination info
  try {
    const firstResponse = await fetchProductsPage(currentPage, perPage, categoryId);
    totalPages = firstResponse.totalPages;
    totalProducts = firstResponse.total;

    console.log(`Found ${totalProducts} total products across ${totalPages} pages`);

    // Convert and add first page products
    const firstPageProducts = firstResponse.products.map(toProductListItem);
    allProducts.push(...firstPageProducts);
    onProgress?.(allProducts.length, totalProducts, currentPage);

    // Check if we've reached the max products limit
    if (maxProducts && allProducts.length >= maxProducts) {
      console.log(`Reached max products limit (${maxProducts})`);
      return allProducts.slice(0, maxProducts);
    }

    currentPage++;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching first page: ${errorMessage}`);
    return [];
  }

  // Fetch remaining pages with rate limiting
  while (currentPage <= totalPages) {
    // Rate limiting - wait before each subsequent request
    const delay = getSurfboardFactoryRandomDelay();
    console.log(`Rate limiting: waiting ${delay}ms before page ${currentPage}`);
    await sleep(delay);

    try {
      const response = await fetchProductsPage(currentPage, perPage, categoryId);
      const pageProducts = response.products.map(toProductListItem);
      allProducts.push(...pageProducts);

      console.log(
        `Fetched page ${currentPage}/${totalPages}: ${pageProducts.length} products (total: ${allProducts.length})`
      );
      onProgress?.(allProducts.length, totalProducts, currentPage);

      // Check if we've reached the max products limit
      if (maxProducts && allProducts.length >= maxProducts) {
        console.log(`Reached max products limit (${maxProducts})`);
        return allProducts.slice(0, maxProducts);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching page ${currentPage}: ${errorMessage}`);
      // Continue with next page on error
    }

    currentPage++;
  }

  console.log(`Surfboard Factory list scrape complete. Total products: ${allProducts.length}`);

  return allProducts;
}
