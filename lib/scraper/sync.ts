/**
 * Full sync orchestrator for hawaiiansouthshore.com surfboard scraping
 *
 * Coordinates the complete scrape and sync process:
 * 1. Scrapes product list from the collection
 * 2. Scrapes full details for each product
 * 3. Uploads images to Sanity
 * 4. Upserts products to Sanity CMS
 * 5. Marks missing products as out_of_stock
 */

import { scrapeProductList, type ListScraperOptions } from "./list-scraper";
import { scrapeProductDetail } from "./detail-scraper";
import { getRandomDelay, sleep } from "./config";
import type { ScrapedProduct, SyncResult } from "./types";
import { writeClient, upsertSurfboard, uploadImagesFromUrls } from "@/lib/cms";

/**
 * Options for the sync orchestrator
 */
export interface SyncOptions {
  /** Collection handle to scrape (default: "surfboards") */
  collection?: string;
  /** Maximum number of products to sync (default: unlimited) */
  maxProducts?: number;
  /** Whether to upload images to Sanity (default: true) */
  uploadImages?: boolean;
  /** Whether to mark missing products as out_of_stock (default: true) */
  markMissingAsOutOfStock?: boolean;
  /** Callback for progress updates */
  onProgress?: (phase: string, current: number, total: number, message: string) => void;
}

/**
 * Mark products that are no longer found in the scrape as out_of_stock
 *
 * @param scrapedSourceIds - Set of sourceIds that were found in the current scrape
 * @returns Number of products marked as out_of_stock
 */
async function markMissingProductsOutOfStock(scrapedSourceIds: Set<string>): Promise<number> {
  // Fetch all surfboard sourceIds from Sanity
  const existingProducts = await writeClient.fetch<Array<{ _id: string; sourceId: string }>>(
    `*[_type == "surfboard" && stockStatus != "out_of_stock"]{ _id, sourceId }`
  );

  let markedCount = 0;

  for (const product of existingProducts) {
    if (!scrapedSourceIds.has(product.sourceId)) {
      try {
        await writeClient.patch(product._id).set({ stockStatus: "out_of_stock" }).commit();
        console.log(`Marked product ${product.sourceId} as out_of_stock (no longer found)`);
        markedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to mark product ${product.sourceId} as out_of_stock: ${errorMessage}`
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
 * Orchestrates the full scrape and sync process
 *
 * @param options - Sync configuration options
 * @returns SyncResult with created, updated, failed counts and error details
 */
export async function syncAllProducts(options: SyncOptions = {}): Promise<SyncResult> {
  const {
    collection = "surfboards",
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

  console.log("=== Starting Full Product Sync ===");
  console.log(`Collection: ${collection}`);
  console.log(`Max products: ${maxProducts ?? "unlimited"}`);
  console.log(`Upload images: ${uploadImages}`);
  console.log(`Mark missing as out_of_stock: ${markMissingAsOutOfStock}`);
  console.log("");

  // Phase 1: Scrape product list
  console.log("Phase 1: Scraping product list...");
  onProgress?.("list", 0, 0, "Starting product list scrape");

  const listOptions: ListScraperOptions = {
    collection,
    maxProducts,
    onProgress: (fetched, page) => {
      onProgress?.(
        "list",
        fetched,
        maxProducts ?? fetched,
        `Fetched ${fetched} products (page ${page})`
      );
    },
  };

  let productList;
  try {
    productList = await scrapeProductList(listOptions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Fatal error during list scrape: ${errorMessage}`);
    result.errors.push({ handle: "list-scrape", error: errorMessage });
    return result;
  }

  console.log(`Found ${productList.length} products to process`);
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
  console.log("Phase 2: Scraping product details and syncing to Sanity...");

  const scrapedSourceIds = new Set<string>();

  for (let i = 0; i < productList.length; i++) {
    const listItem = productList[i];
    const progress = `[${i + 1}/${productList.length}]`;

    onProgress?.("sync", i + 1, productList.length, `Processing: ${listItem.name}`);
    console.log(`${progress} Processing: ${listItem.handle}`);

    // Rate limiting between products (except the first)
    if (i > 0) {
      const delay = getRandomDelay();
      await sleep(delay);
    }

    // Scrape full product details
    const product = await scrapeProductDetail(listItem.handle, { skipRateLimit: true });

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

  // Phase 3: Mark missing products as out_of_stock
  if (markMissingAsOutOfStock) {
    console.log("");
    console.log("Phase 3: Marking missing products as out_of_stock...");
    onProgress?.("cleanup", 0, 0, "Checking for missing products");

    const markedCount = await markMissingProductsOutOfStock(scrapedSourceIds);
    console.log(`Marked ${markedCount} products as out_of_stock`);
    onProgress?.(
      "cleanup",
      markedCount,
      markedCount,
      `Marked ${markedCount} products as out_of_stock`
    );
  }

  // Summary
  console.log("");
  console.log("=== Sync Complete ===");
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
