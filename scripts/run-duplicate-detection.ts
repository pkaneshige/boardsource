/**
 * Script to run duplicate detection on all existing products
 *
 * Fetches all in-stock surfboards from Sanity, runs the improved structured
 * duplicate detection, logs matches with confidence scores and details,
 * and links matched products via relatedListings.
 *
 * Run with: npx tsx scripts/run-duplicate-detection.ts
 */

import { sanityFetch, linkRelatedListings } from "../lib/cms";
import {
  findDuplicates,
  logMatchDetails,
  DEFAULT_MATCHER_CONFIG,
} from "../lib/scraper/duplicate-detector";
import type { Surfboard } from "../types";

/**
 * Summary of duplicate detection results
 */
interface DetectionSummary {
  totalProducts: number;
  matchesFound: number;
  linksCreated: number;
  linksFailed: number;
  matchesBelowAutoLinkThreshold: number;
}

/**
 * Runs duplicate detection on all in-stock surfboards
 */
async function runDuplicateDetection(): Promise<DetectionSummary> {
  console.log("=".repeat(70));
  console.log("DUPLICATE DETECTION - STRUCTURED COMPARISON");
  console.log("=".repeat(70));
  console.log();

  // Fetch all in-stock surfboards from Sanity
  console.log("Fetching in-stock surfboards from Sanity...");
  const products = await sanityFetch<Surfboard[]>(
    `*[_type == "surfboard" && stockStatus != "out_of_stock"]{
      _id,
      name,
      shaper,
      dimensions,
      source,
      sourceName,
      relatedListings
    }`
  );

  console.log(`Total products fetched: ${products.length}`);
  console.log();

  // Group products by source for logging
  const bySource: Record<string, number> = {};
  for (const product of products) {
    const source = product.source || "unknown";
    bySource[source] = (bySource[source] || 0) + 1;
  }

  console.log("Products by source:");
  for (const [source, count] of Object.entries(bySource)) {
    console.log(`  ${source}: ${count} products`);
  }
  console.log();

  // Run duplicate detection with structured comparison
  console.log("Running duplicate detection with structured comparison...");
  console.log(`Configuration:`);
  console.log(`  - Length tolerance: ${DEFAULT_MATCHER_CONFIG.lengthToleranceInches} inch`);
  console.log(`  - Model similarity threshold: ${DEFAULT_MATCHER_CONFIG.modelSimilarityThreshold}`);
  console.log(`  - Min confidence to auto-link: ${DEFAULT_MATCHER_CONFIG.minConfidenceToAutoLink}`);
  console.log(`  - Require brand match: ${DEFAULT_MATCHER_CONFIG.requireBrandMatch}`);
  console.log();

  const matches = findDuplicates(products, {
    threshold: DEFAULT_MATCHER_CONFIG.minConfidenceToAutoLink,
    crossSourceOnly: true,
  });

  console.log(`Matches found: ${matches.length}`);
  console.log();

  // Create a map of product IDs to names for logging
  const productNames = new Map<string, string>();
  for (const product of products) {
    productNames.set(product._id, product.name);
  }

  // Track summary statistics
  const summary: DetectionSummary = {
    totalProducts: products.length,
    matchesFound: matches.length,
    linksCreated: 0,
    linksFailed: 0,
    matchesBelowAutoLinkThreshold: 0,
  };

  if (matches.length === 0) {
    console.log("No duplicate matches found.");
    return summary;
  }

  // Log and process each match
  console.log("=".repeat(70));
  console.log("MATCHES FOUND");
  console.log("=".repeat(70));

  for (const match of matches) {
    const productName1 = productNames.get(match.productId) || "Unknown";
    const productName2 = productNames.get(match.matchedProductId) || "Unknown";

    // Log detailed match info
    logMatchDetails(match, productName1, productName2);

    // Check if this match meets the auto-link threshold
    if (match.similarity >= DEFAULT_MATCHER_CONFIG.minConfidenceToAutoLink) {
      console.log(
        `→ Auto-linking products (confidence ${(match.similarity * 100).toFixed(1)}% >= ${(DEFAULT_MATCHER_CONFIG.minConfidenceToAutoLink * 100).toFixed(0)}% threshold)`
      );

      // Link the products using linkRelatedListings
      const linkSuccess = await linkRelatedListings(match.productId, match.matchedProductId);

      if (linkSuccess) {
        console.log("✓ Successfully linked products");
        summary.linksCreated++;
      } else {
        console.log("✗ Failed to link products");
        summary.linksFailed++;
      }
    } else {
      console.log(
        `→ Skipping auto-link (confidence ${(match.similarity * 100).toFixed(1)}% < ${(DEFAULT_MATCHER_CONFIG.minConfidenceToAutoLink * 100).toFixed(0)}% threshold)`
      );
      summary.matchesBelowAutoLinkThreshold++;
    }
  }

  return summary;
}

/**
 * Prints the final summary report
 */
function printSummary(summary: DetectionSummary): void {
  console.log();
  console.log("=".repeat(70));
  console.log("SUMMARY REPORT");
  console.log("=".repeat(70));
  console.log();
  console.log(`Total products analyzed:     ${summary.totalProducts}`);
  console.log(`Duplicate matches found:     ${summary.matchesFound}`);
  console.log(`Links created:               ${summary.linksCreated}`);
  console.log(`Links failed:                ${summary.linksFailed}`);
  console.log(`Below auto-link threshold:   ${summary.matchesBelowAutoLinkThreshold}`);
  console.log();

  if (summary.matchesFound > 0) {
    const successRate =
      summary.linksCreated > 0
        ? ((summary.linksCreated / (summary.linksCreated + summary.linksFailed)) * 100).toFixed(1)
        : "N/A";
    console.log(`Link success rate: ${successRate}%`);
  }

  console.log();
  console.log("=".repeat(70));
}

// Run the script
runDuplicateDetection()
  .then((summary) => {
    printSummary(summary);
    console.log("Duplicate detection complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error running duplicate detection:", error);
    process.exit(1);
  });
