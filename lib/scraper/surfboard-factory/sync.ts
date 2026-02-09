/**
 * Full sync orchestrator for surfboardfactoryhawaii.com surfboard scraping
 *
 * Coordinates the complete scrape and sync process:
 * 1. Scrapes product list from WooCommerce Store API (gets full product data)
 * 2. Converts products to ScrapedProduct format
 * 3. Uploads images to Sanity
 * 4. Upserts products to Sanity CMS with source: 'surfboard-factory'
 * 5. Marks missing Surfboard Factory products as out_of_stock
 * 6. Detects and links duplicate listings across sources
 */

import { scrapeSurfboardFactoryDetail } from "./detail-scraper";
import {
  SURFBOARD_FACTORY_CATEGORY_IDS,
  SURFBOARD_FACTORY_SOURCE,
  SURFBOARD_FACTORY_API_URL,
  SURFBOARD_FACTORY_TIMEOUT_MS,
  surfboardFactoryHeaders,
  surfboardFactoryPagination,
  getSurfboardFactoryRandomDelay,
  sleep,
} from "./config";
import type { WooCommerceProduct } from "./types";
import type { ScrapedProduct, SyncResult } from "@/lib/scraper";
import { writeClient, upsertSurfboard, uploadImagesFromUrls, linkRelatedListings } from "@/lib/cms";
import { findDuplicates } from "@/lib/scraper/duplicate-detector";
import type { Surfboard } from "@/types";

/**
 * Options for the Surfboard Factory sync orchestrator
 */
export interface SurfboardFactorySyncOptions {
  /** Specific WooCommerce category ID to sync (default: all surfboards) */
  categoryId?: number;
  /** Maximum number of products to sync (default: unlimited) */
  maxProducts?: number;
  /** Whether to upload images to Sanity (default: true) */
  uploadImages?: boolean;
  /** Whether to mark missing Surfboard Factory products as out_of_stock (default: true) */
  markMissingAsOutOfStock?: boolean;
  /** Callback for progress updates */
  onProgress?: (phase: string, current: number, total: number, message: string) => void;
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
  const baseUrl = `${SURFBOARD_FACTORY_API_URL}/products`;
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  if (categoryId) {
    params.set("category", String(categoryId));
  }

  const url = `${baseUrl}?${params.toString()}`;

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
 * Fetch all products from WooCommerce Store API with pagination and rate limiting
 * Returns full WooCommerceProduct objects (not just list items)
 */
async function fetchAllProducts(
  categoryId?: number,
  maxProducts?: number,
  onProgress?: (fetched: number, total: number, page: number) => void
): Promise<WooCommerceProduct[]> {
  const perPage = surfboardFactoryPagination.perPage;
  const allProducts: WooCommerceProduct[] = [];
  let currentPage = 1;
  let totalPages = 1;
  let totalProducts = 0;

  console.log(
    `Fetching Surfboard Factory products${categoryId ? ` for category ${categoryId}` : ""}`
  );

  // Fetch first page to get pagination info
  const firstResponse = await fetchProductsPage(currentPage, perPage, categoryId);
  totalPages = firstResponse.totalPages;
  totalProducts = firstResponse.total;

  console.log(`Found ${totalProducts} total products across ${totalPages} pages`);

  allProducts.push(...firstResponse.products);
  onProgress?.(allProducts.length, totalProducts, currentPage);

  // Check if we've reached the max products limit
  if (maxProducts && allProducts.length >= maxProducts) {
    console.log(`Reached max products limit (${maxProducts})`);
    return allProducts.slice(0, maxProducts);
  }

  currentPage++;

  // Fetch remaining pages with rate limiting
  while (currentPage <= totalPages) {
    // Rate limiting - wait before each subsequent request
    const delay = getSurfboardFactoryRandomDelay();
    console.log(`Rate limiting: waiting ${delay}ms before page ${currentPage}`);
    await sleep(delay);

    const response = await fetchProductsPage(currentPage, perPage, categoryId);
    allProducts.push(...response.products);

    console.log(
      `Fetched page ${currentPage}/${totalPages}: ${response.products.length} products (total: ${allProducts.length})`
    );
    onProgress?.(allProducts.length, totalProducts, currentPage);

    // Check if we've reached the max products limit
    if (maxProducts && allProducts.length >= maxProducts) {
      console.log(`Reached max products limit (${maxProducts})`);
      return allProducts.slice(0, maxProducts);
    }

    currentPage++;
  }

  console.log(`Fetch complete. Total products: ${allProducts.length}`);
  return allProducts;
}

/**
 * Mark Surfboard Factory products that are no longer found in the scrape as out_of_stock
 * Only affects products with source === 'surfboard-factory'
 *
 * @param scrapedSourceIds - Set of sourceIds that were found in the current scrape
 * @returns Number of products marked as out_of_stock
 */
async function markMissingSurfboardFactoryProductsOutOfStock(
  scrapedSourceIds: Set<string>
): Promise<number> {
  // Fetch all Surfboard Factory surfboard sourceIds from Sanity (only those not already out_of_stock)
  const existingProducts = await writeClient.fetch<Array<{ _id: string; sourceId: string }>>(
    `*[_type == "surfboard" && source == $source && stockStatus != "out_of_stock"]{ _id, sourceId }`,
    { source: SURFBOARD_FACTORY_SOURCE }
  );

  let markedCount = 0;

  for (const product of existingProducts) {
    if (!scrapedSourceIds.has(product.sourceId)) {
      try {
        await writeClient.patch(product._id).set({ stockStatus: "out_of_stock" }).commit();
        console.log(
          `Marked Surfboard Factory product ${product.sourceId} as out_of_stock (no longer found)`
        );
        markedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to mark Surfboard Factory product ${product.sourceId} as out_of_stock: ${errorMessage}`
        );
      }
    }
  }

  return markedCount;
}

/**
 * Sync a single product: upload images and upsert to Sanity
 */
async function syncProduct(
  product: ScrapedProduct,
  uploadImages: boolean
): Promise<{ success: boolean; created: boolean; error?: string }> {
  try {
    let imageAssets: Array<{ _type: "reference"; _ref: string }> | undefined;

    // Upload images if enabled and product has images
    if (uploadImages && product.imageUrls.length > 0) {
      console.log(`Uploading ${product.imageUrls.length} images for: ${product.name}`);
      const uploadResults = await uploadImagesFromUrls(product.imageUrls);

      // Collect successful uploads
      imageAssets = uploadResults.filter((r) => r.success && r.assetRef).map((r) => r.assetRef!);

      const successCount = imageAssets.length;
      const failCount = uploadResults.length - successCount;

      if (failCount > 0) {
        console.warn(
          `${failCount}/${uploadResults.length} image uploads failed for: ${product.name}`
        );
      }
    }

    // Upsert product to Sanity
    const result = await upsertSurfboard(product, imageAssets);

    if (!result.success) {
      return { success: false, created: false, error: result.error };
    }

    return { success: true, created: result.created };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, created: false, error: errorMessage };
  }
}

/**
 * Orchestrates the full Surfboard Factory scrape and sync process
 *
 * @param options - Sync configuration options
 * @returns SyncResult with created, updated, failed counts and error details
 */
export async function syncSurfboardFactoryProducts(
  options: SurfboardFactorySyncOptions = {}
): Promise<SyncResult> {
  const {
    categoryId = SURFBOARD_FACTORY_CATEGORY_IDS.surfboards,
    maxProducts,
    uploadImages = true,
    markMissingAsOutOfStock = true,
    onProgress,
  } = options;

  const result: SyncResult = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  console.log("=== Starting Surfboard Factory Product Sync ===");
  console.log(`Category ID: ${categoryId}`);
  console.log(`Max products: ${maxProducts ?? "unlimited"}`);
  console.log(`Upload images: ${uploadImages}`);
  console.log(`Mark missing as out_of_stock: ${markMissingAsOutOfStock}`);
  console.log("");

  // Phase 1: Fetch all products from WooCommerce API
  console.log("Phase 1: Fetching Surfboard Factory products from API...");
  onProgress?.("list", 0, 0, "Starting product fetch from API");

  let wooProducts: WooCommerceProduct[];
  try {
    wooProducts = await fetchAllProducts(categoryId, maxProducts, (fetched, total, page) => {
      onProgress?.("list", fetched, total, `Fetched ${fetched}/${total} products (page ${page})`);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Fatal error during Surfboard Factory API fetch: ${errorMessage}`);
    result.errors.push({ handle: "api-fetch", error: errorMessage });
    return result;
  }

  console.log(`Found ${wooProducts.length} Surfboard Factory products to process`);
  onProgress?.(
    "list",
    wooProducts.length,
    wooProducts.length,
    `Found ${wooProducts.length} products`
  );

  if (wooProducts.length === 0) {
    console.log("No products found. Sync complete.");
    return result;
  }

  // Phase 2: Convert products and sync to Sanity
  console.log("");
  console.log("Phase 2: Converting products and syncing to Sanity...");

  const scrapedSourceIds = new Set<string>();

  for (let i = 0; i < wooProducts.length; i++) {
    const wooProduct = wooProducts[i];
    const progress = `[${i + 1}/${wooProducts.length}]`;

    onProgress?.("sync", i + 1, wooProducts.length, `Processing: ${wooProduct.name}`);
    console.log(`${progress} Processing: ${wooProduct.slug}`);

    // Convert WooCommerce product to ScrapedProduct
    // No rate limiting needed here as we already have the data
    const product = await scrapeSurfboardFactoryDetail(wooProduct, { skipRateLimit: true });

    if (!product) {
      console.error(`${progress} Failed to convert product: ${wooProduct.slug}`);
      result.failed++;
      result.errors.push({ handle: wooProduct.slug, error: "Failed to convert product" });
      continue;
    }

    // Track the sourceId for later comparison
    scrapedSourceIds.add(product.sourceId);

    // Sync product to Sanity
    const syncResult = await syncProduct(product, uploadImages);

    if (syncResult.success) {
      if (syncResult.created) {
        result.created++;
        console.log(`${progress} Created: ${product.name}`);
      } else {
        result.updated++;
        console.log(`${progress} Updated: ${product.name}`);
      }
    } else {
      result.failed++;
      result.errors.push({ handle: wooProduct.slug, error: syncResult.error ?? "Unknown error" });
      console.error(`${progress} Failed to sync: ${product.name} - ${syncResult.error}`);
    }
  }

  // Phase 3: Mark missing Surfboard Factory products as out_of_stock
  if (markMissingAsOutOfStock) {
    console.log("");
    console.log("Phase 3: Marking missing Surfboard Factory products as out_of_stock...");
    onProgress?.("cleanup", 0, 0, "Checking for missing Surfboard Factory products");

    const markedCount = await markMissingSurfboardFactoryProductsOutOfStock(scrapedSourceIds);
    console.log(`Marked ${markedCount} Surfboard Factory products as out_of_stock`);
    onProgress?.(
      "cleanup",
      markedCount,
      markedCount,
      `Marked ${markedCount} Surfboard Factory products as out_of_stock`
    );
  }

  // Phase 4: Detect and link duplicate listings across sources
  console.log("");
  console.log("Phase 4: Detecting and linking duplicate listings...");
  onProgress?.("duplicates", 0, 0, "Detecting duplicates across vendors");

  try {
    // Fetch all surfboards from Sanity for duplicate detection
    const allProducts = await writeClient.fetch<Surfboard[]>(
      `*[_type == "surfboard" && stockStatus != "out_of_stock"]{ _id, name, shaper, source }`
    );

    console.log(`Analyzing ${allProducts.length} products for duplicates...`);

    // Find duplicates (only across different sources)
    const duplicates = findDuplicates(allProducts, {
      threshold: 0.85,
      crossSourceOnly: true,
    });

    console.log(`Found ${duplicates.length} duplicate matches`);

    // Link each duplicate pair
    let linkedCount = 0;
    for (const match of duplicates) {
      const productA = allProducts.find((p) => p._id === match.productId);
      const productB = allProducts.find((p) => p._id === match.matchedProductId);

      console.log(
        `Linking duplicates (similarity: ${(match.similarity * 100).toFixed(1)}%): ` +
          `"${productA?.name}" (${productA?.source}) <-> "${productB?.name}" (${productB?.source})`
      );

      const linked = await linkRelatedListings(match.productId, match.matchedProductId);
      if (linked) {
        linkedCount++;
      }
    }

    console.log(`Successfully linked ${linkedCount}/${duplicates.length} duplicate pairs`);
    onProgress?.(
      "duplicates",
      linkedCount,
      duplicates.length,
      `Linked ${linkedCount} duplicate pairs`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error during duplicate detection: ${errorMessage}`);
  }

  // Summary
  console.log("");
  console.log("=== Surfboard Factory Sync Complete ===");
  console.log(`Created: ${result.created}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log("");
    console.log("Errors:");
    for (const err of result.errors) {
      console.log(`  - ${err.handle}: ${err.error}`);
    }
  }

  onProgress?.(
    "complete",
    0,
    0,
    `Sync complete. Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.failed}`
  );

  return result;
}
