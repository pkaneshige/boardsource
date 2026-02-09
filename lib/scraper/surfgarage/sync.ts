/**
 * Full sync orchestrator for surfgarage.squarespace.com surfboard scraping
 *
 * Coordinates the complete scrape and sync process:
 * 1. Scrapes product list from specified or all categories
 * 2. Scrapes full details for each product
 * 3. Uploads images to Sanity
 * 4. Upserts products to Sanity CMS with source: 'surfgarage'
 * 5. Marks missing Surfgarage products as out_of_stock
 */

import { scrapeSurfgarageList } from "./list-scraper";
import { scrapeSurfgarageDetail } from "./detail-scraper";
import {
  SURFGARAGE_CATEGORIES,
  SURFGARAGE_SOURCE,
  getSurfgarageRandomDelay,
  sleep,
} from "./config";
import type { SurfgarageCategory } from "./config";
import type { ScrapedProduct, SyncResult, ProductListItem } from "@/lib/scraper";
import { writeClient, upsertSurfboard, uploadImagesFromUrls, linkRelatedListings } from "@/lib/cms";
import { findDuplicates } from "@/lib/scraper/duplicate-detector";
import type { Surfboard } from "@/types";

/**
 * Options for the Surfgarage sync orchestrator
 */
export interface SurfgarageSyncOptions {
  /** Specific category to sync (default: all categories) */
  category?: SurfgarageCategory;
  /** Maximum number of products to sync (default: unlimited) */
  maxProducts?: number;
  /** Whether to upload images to Sanity (default: true) */
  uploadImages?: boolean;
  /** Whether to mark missing Surfgarage products as out_of_stock (default: true) */
  markMissingAsOutOfStock?: boolean;
  /** Callback for progress updates */
  onProgress?: (phase: string, current: number, total: number, message: string) => void;
}

/**
 * Mark Surfgarage products that are no longer found in the scrape as out_of_stock
 * Only affects products with source === 'surfgarage'
 *
 * @param scrapedSourceIds - Set of sourceIds that were found in the current scrape
 * @returns Number of products marked as out_of_stock
 */
async function markMissingSurfgarageProductsOutOfStock(
  scrapedSourceIds: Set<string>
): Promise<number> {
  // Fetch all Surfgarage surfboard sourceIds from Sanity (only those not already out_of_stock)
  const existingProducts = await writeClient.fetch<Array<{ _id: string; sourceId: string }>>(
    `*[_type == "surfboard" && source == $source && stockStatus != "out_of_stock"]{ _id, sourceId }`,
    { source: SURFGARAGE_SOURCE }
  );

  let markedCount = 0;

  for (const product of existingProducts) {
    if (!scrapedSourceIds.has(product.sourceId)) {
      try {
        await writeClient.patch(product._id).set({ stockStatus: "out_of_stock" }).commit();
        console.log(
          `Marked Surfgarage product ${product.sourceId} as out_of_stock (no longer found)`
        );
        markedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to mark Surfgarage product ${product.sourceId} as out_of_stock: ${errorMessage}`
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
 * Extract category from product URL
 * URL format: https://surfgarage.squarespace.com/<category>/<product-id>
 */
function extractCategoryFromUrl(url: string): SurfgarageCategory | null {
  for (const category of SURFGARAGE_CATEGORIES) {
    if (url.includes(`/${category}/`)) {
      return category;
    }
  }
  return null;
}

/**
 * Orchestrates the full Surfgarage scrape and sync process
 *
 * @param options - Sync configuration options
 * @returns SyncResult with created, updated, failed counts and error details
 */
export async function syncSurfgarageProducts(
  options: SurfgarageSyncOptions = {}
): Promise<SyncResult> {
  const {
    category,
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

  const categoriesToSync = category ? [category] : [...SURFGARAGE_CATEGORIES];

  console.log("=== Starting Surfgarage Product Sync ===");
  console.log(`Categories: ${categoriesToSync.join(", ")}`);
  console.log(`Max products: ${maxProducts ?? "unlimited"}`);
  console.log(`Upload images: ${uploadImages}`);
  console.log(`Mark missing as out_of_stock: ${markMissingAsOutOfStock}`);
  console.log("");

  // Phase 1: Scrape product list
  console.log("Phase 1: Scraping Surfgarage product list...");
  onProgress?.("list", 0, 0, "Starting product list scrape");

  let productList: ProductListItem[];
  try {
    productList = await scrapeSurfgarageList({
      category,
      maxProducts,
      onProgress: (fetched, categoryName) => {
        onProgress?.(
          "list",
          fetched,
          maxProducts ?? fetched,
          `Fetched ${fetched} products from ${categoryName}`
        );
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Fatal error during Surfgarage list scrape: ${errorMessage}`);
    result.errors.push({ handle: "list-scrape", error: errorMessage });
    return result;
  }

  console.log(`Found ${productList.length} Surfgarage products to process`);
  onProgress?.(
    "list",
    productList.length,
    productList.length,
    `Found ${productList.length} products`
  );

  if (productList.length === 0) {
    console.log("No products found. Sync complete.");
    return result;
  }

  // Phase 2: Scrape details and sync each product
  console.log("");
  console.log("Phase 2: Scraping Surfgarage product details and syncing to Sanity...");

  const scrapedSourceIds = new Set<string>();

  for (let i = 0; i < productList.length; i++) {
    const listItem = productList[i];
    const progress = `[${i + 1}/${productList.length}]`;

    onProgress?.("sync", i + 1, productList.length, `Processing: ${listItem.name}`);
    console.log(`${progress} Processing: ${listItem.handle}`);

    // Rate limiting between products (except the first)
    if (i > 0) {
      const delay = getSurfgarageRandomDelay();
      await sleep(delay);
    }

    // Extract category from URL
    const productCategory = extractCategoryFromUrl(listItem.url);
    if (!productCategory) {
      console.error(`${progress} Could not extract category from URL: ${listItem.url}`);
      result.failed++;
      result.errors.push({ handle: listItem.handle, error: "Could not extract category from URL" });
      continue;
    }

    // Scrape full product details
    const product = await scrapeSurfgarageDetail(
      { category: productCategory, urlId: listItem.handle },
      { skipRateLimit: true }
    );

    if (!product) {
      console.error(`${progress} Failed to scrape details for: ${listItem.handle}`);
      result.failed++;
      result.errors.push({ handle: listItem.handle, error: "Failed to scrape product details" });
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
      result.errors.push({ handle: listItem.handle, error: syncResult.error ?? "Unknown error" });
      console.error(`${progress} Failed to sync: ${product.name} - ${syncResult.error}`);
    }
  }

  // Phase 3: Mark missing Surfgarage products as out_of_stock
  if (markMissingAsOutOfStock) {
    console.log("");
    console.log("Phase 3: Marking missing Surfgarage products as out_of_stock...");
    onProgress?.("cleanup", 0, 0, "Checking for missing Surfgarage products");

    const markedCount = await markMissingSurfgarageProductsOutOfStock(scrapedSourceIds);
    console.log(`Marked ${markedCount} Surfgarage products as out_of_stock`);
    onProgress?.(
      "cleanup",
      markedCount,
      markedCount,
      `Marked ${markedCount} Surfgarage products as out_of_stock`
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
  console.log("=== Surfgarage Sync Complete ===");
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
