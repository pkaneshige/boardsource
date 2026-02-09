/**
 * Script to analyze duplicate detection gaps
 *
 * Queries all products from Sanity and identifies naming pattern differences
 * between sources (Hawaiian South Shore, Surf Garage) that cause duplicate
 * detection to find 0 matches.
 *
 * Run with: npx tsx scripts/analyze-duplicates.ts
 */

import { sanityFetch } from "../lib/cms";
import {
  findDuplicates,
  createComparisonKey,
  calculateSimilarity,
} from "../lib/scraper/duplicate-detector";
import type { Surfboard } from "../types";

interface ProductForAnalysis {
  _id: string;
  name: string;
  shaper?: string;
  dimensions?: string;
  source?: string;
  sourceName?: string;
}

async function analyzeProducts() {
  console.log("=".repeat(70));
  console.log("DUPLICATE DETECTION GAP ANALYSIS");
  console.log("=".repeat(70));
  console.log();

  // Fetch all in-stock surfboards from Sanity
  const products = await sanityFetch<ProductForAnalysis[]>(
    `*[_type == "surfboard" && stockStatus != "out_of_stock"]{
      _id,
      name,
      shaper,
      dimensions,
      source,
      sourceName
    }`
  );

  console.log(`Total products fetched: ${products.length}\n`);

  // Group products by source
  const bySource: Record<string, ProductForAnalysis[]> = {};
  for (const product of products) {
    const source = product.source || "unknown";
    if (!bySource[source]) {
      bySource[source] = [];
    }
    bySource[source].push(product);
  }

  // Log counts per source
  console.log("Products by source:");
  for (const [source, items] of Object.entries(bySource)) {
    console.log(`  ${source}: ${items.length} products`);
  }
  console.log();

  // Log sample product names from each source
  console.log("=".repeat(70));
  console.log("SAMPLE PRODUCT NAMES BY SOURCE");
  console.log("=".repeat(70));
  console.log();

  for (const [source, items] of Object.entries(bySource)) {
    console.log(`--- ${source} (${items.length} total) ---`);
    const samples = items.slice(0, 10);
    for (const product of samples) {
      console.log(`  Name: "${product.name}"`);
      console.log(`  Shaper: "${product.shaper || "N/A"}"`);
      console.log(`  Dimensions: "${product.dimensions || "N/A"}"`);
      console.log(`  Comparison key: "${createComparisonKey(product.shaper, product.name)}"`);
      console.log();
    }
    console.log();
  }

  // Analyze naming patterns
  console.log("=".repeat(70));
  console.log("NAMING PATTERN ANALYSIS");
  console.log("=".repeat(70));
  console.log();

  const patterns = {
    hasDimensionsInName: { hss: 0, sg: 0 },
    hasColorInName: { hss: 0, sg: 0 },
    hasBrandPrefix: { hss: 0, sg: 0 },
    hasBrandSuffix: { hss: 0, sg: 0 },
  };

  const dimensionPatterns = [/\d+['"]\s*\d*/, /\d+\s*x\s*\d+/i, /\d+ft/i];
  const colorWords = ["white", "black", "blue", "red", "gray", "grey", "yellow", "green", "teal"];

  for (const product of products) {
    const source = product.source === "hawaiian-south-shore" ? "hss" : "sg";
    const nameLower = product.name.toLowerCase();
    const shaper = product.shaper?.toLowerCase() || "";

    // Check if dimensions are in the name
    for (const pattern of dimensionPatterns) {
      if (pattern.test(product.name)) {
        patterns.hasDimensionsInName[source]++;
        break;
      }
    }

    // Check if color is in name
    for (const color of colorWords) {
      if (nameLower.includes(color)) {
        patterns.hasColorInName[source]++;
        break;
      }
    }

    // Check brand position
    if (shaper && nameLower.startsWith(shaper)) {
      patterns.hasBrandPrefix[source]++;
    }
    if (shaper && nameLower.endsWith(shaper)) {
      patterns.hasBrandSuffix[source]++;
    }
  }

  const hssCount = bySource["hawaiian-south-shore"]?.length || 1;
  const sgCount = bySource["surfgarage"]?.length || 1;

  console.log("Pattern frequency (% of products with pattern):");
  console.log();
  console.log(
    `Dimensions in name:  HSS: ${((patterns.hasDimensionsInName.hss / hssCount) * 100).toFixed(1)}%  |  SG: ${((patterns.hasDimensionsInName.sg / sgCount) * 100).toFixed(1)}%`
  );
  console.log(
    `Color in name:       HSS: ${((patterns.hasColorInName.hss / hssCount) * 100).toFixed(1)}%  |  SG: ${((patterns.hasColorInName.sg / sgCount) * 100).toFixed(1)}%`
  );
  console.log(
    `Brand as prefix:     HSS: ${((patterns.hasBrandPrefix.hss / hssCount) * 100).toFixed(1)}%  |  SG: ${((patterns.hasBrandPrefix.sg / sgCount) * 100).toFixed(1)}%`
  );
  console.log(
    `Brand as suffix:     HSS: ${((patterns.hasBrandSuffix.hss / hssCount) * 100).toFixed(1)}%  |  SG: ${((patterns.hasBrandSuffix.sg / sgCount) * 100).toFixed(1)}%`
  );
  console.log();

  // Run current duplicate detection and show results
  console.log("=".repeat(70));
  console.log("CURRENT DUPLICATE DETECTION RESULTS");
  console.log("=".repeat(70));
  console.log();

  const fullProducts = await sanityFetch<Surfboard[]>(
    `*[_type == "surfboard" && stockStatus != "out_of_stock"]{
      _id,
      name,
      shaper,
      dimensions,
      source,
      sourceName
    }`
  );

  const matches = findDuplicates(fullProducts, { threshold: 0.85, crossSourceOnly: true });
  console.log(`Matches found with 0.85 threshold: ${matches.length}`);

  // Also try lower thresholds
  const matches80 = findDuplicates(fullProducts, { threshold: 0.8, crossSourceOnly: true });
  console.log(`Matches found with 0.80 threshold: ${matches80.length}`);

  const matches70 = findDuplicates(fullProducts, { threshold: 0.7, crossSourceOnly: true });
  console.log(`Matches found with 0.70 threshold: ${matches70.length}`);

  const matches60 = findDuplicates(fullProducts, { threshold: 0.6, crossSourceOnly: true });
  console.log(`Matches found with 0.60 threshold: ${matches60.length}`);
  console.log();

  // Find potential duplicates manually by looking for similar brand + model combinations
  console.log("=".repeat(70));
  console.log("POTENTIAL DUPLICATES (Manual Analysis)");
  console.log("=".repeat(70));
  console.log();

  // Try to match products by brand
  const hssProducts = bySource["hawaiian-south-shore"] || [];
  const sgProducts = bySource["surfgarage"] || [];

  console.log("Cross-source product comparisons (first 20):");
  console.log();

  let comparisonCount = 0;
  for (const hss of hssProducts.slice(0, 5)) {
    for (const sg of sgProducts.slice(0, 5)) {
      if (comparisonCount >= 20) break;

      const hssKey = createComparisonKey(hss.shaper, hss.name);
      const sgKey = createComparisonKey(sg.shaper, sg.name);
      const similarity = calculateSimilarity(hssKey, sgKey);

      if (similarity > 0.3) {
        // Show even low-similarity matches
        console.log(`HSS: "${hss.name}" (shaper: ${hss.shaper || "N/A"})`);
        console.log(`SG:  "${sg.name}" (shaper: ${sg.shaper || "N/A"})`);
        console.log(`Keys: "${hssKey}" vs "${sgKey}"`);
        console.log(`Similarity: ${(similarity * 100).toFixed(1)}%`);
        console.log();
        comparisonCount++;
      }
    }
    if (comparisonCount >= 20) break;
  }

  // Document key findings
  console.log("=".repeat(70));
  console.log("KEY FINDINGS / GAPS IDENTIFIED");
  console.log("=".repeat(70));
  console.log();
  console.log("1. DIMENSION FORMAT DIFFERENCES");
  console.log("   - HSS format: 5'4 X 20 13/16 X 2 1/4\" or similar");
  console.log("   - SG format: varies, often just length");
  console.log("   - Impact: Dimensions in name reduce string similarity");
  console.log();
  console.log("2. BRAND/SHAPER HANDLING");
  console.log("   - HSS: Brand often in separate 'shaper' field");
  console.log("   - SG: Brand may be in name or separate field");
  console.log("   - Impact: Inconsistent comparison keys");
  console.log();
  console.log("3. MODEL NAME EXTRACTION");
  console.log("   - Names contain noise: dimensions, colors, years");
  console.log('   - Core model name (e.g., "Seaside", "Fish") buried in string');
  console.log("   - Impact: String similarity fails on noisy data");
  console.log();
  console.log("4. RECOMMENDATIONS");
  console.log("   - Normalize dimensions to a standard format");
  console.log("   - Extract brand reliably from name or shaper field");
  console.log("   - Extract core model name by removing dimensions/colors");
  console.log("   - Compare structured data (brand + model + length) not raw strings");
  console.log();
}

analyzeProducts().catch(console.error);
