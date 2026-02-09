/**
 * Backfill script: Parse dimension and volume strings for existing surfboard products.
 *
 * Fetches all surfboards from Sanity that have dimension/volume strings,
 * parses them into structured numeric fields, and updates each product.
 *
 * Run with: npx tsx scripts/backfill-dimensions.ts
 */

import { sanityFetch } from "@/lib/cms";
import { writeClient } from "@/lib/cms/write-client";
import { parseDimensionString, parseVolumeString } from "@/lib/utils/parse-dimensions";

interface SurfboardRow {
  _id: string;
  name: string;
  dimensions?: string;
  volume?: string;
  lengthFeet?: number;
  volumeLiters?: number;
}

async function backfillDimensions() {
  console.log("Fetching surfboards from Sanity...");

  const surfboards = await sanityFetch<SurfboardRow[]>(
    `*[_type == "surfboard"] { _id, name, dimensions, volume, lengthFeet, volumeLiters }`
  );

  console.log(`Found ${surfboards.length} surfboards\n`);

  let totalProcessed = 0;
  let dimensionsParsed = 0;
  let dimensionsFailed = 0;
  let volumeParsed = 0;
  let volumeFailed = 0;
  let skipped = 0;
  let updated = 0;

  for (const board of surfboards) {
    totalProcessed++;
    const updates: Record<string, number> = {};

    // Parse dimensions if string exists and not already parsed
    if (board.dimensions) {
      if (board.lengthFeet != null) {
        skipped++;
      } else {
        const parsed = parseDimensionString(board.dimensions);
        if (parsed) {
          updates.lengthFeet = parsed.lengthFeet;
          updates.lengthInches = parsed.lengthInches;
          if (parsed.widthInches != null) updates.widthInches = parsed.widthInches;
          if (parsed.thicknessInches != null) updates.thicknessInches = parsed.thicknessInches;
          dimensionsParsed++;
        } else {
          console.log(`  [FAIL] Could not parse dimensions for "${board.name}": "${board.dimensions}"`);
          dimensionsFailed++;
        }
      }
    }

    // Parse volume if string exists and not already parsed
    if (board.volume) {
      if (board.volumeLiters != null) {
        // Already has parsed value
      } else {
        const parsed = parseVolumeString(board.volume);
        if (parsed != null) {
          updates.volumeLiters = parsed;
          volumeParsed++;
        } else {
          console.log(`  [FAIL] Could not parse volume for "${board.name}": "${board.volume}"`);
          volumeFailed++;
        }
      }
    }

    // Update if we have new parsed values
    if (Object.keys(updates).length > 0) {
      try {
        await writeClient.patch(board._id).set(updates).commit();
        updated++;
      } catch (err) {
        console.log(`  [ERROR] Failed to update "${board.name}": ${err}`);
      }
    }
  }

  console.log("\n=== Backfill Summary ===");
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Dimensions parsed: ${dimensionsParsed}`);
  console.log(`Dimensions failed: ${dimensionsFailed}`);
  console.log(`Volume parsed: ${volumeParsed}`);
  console.log(`Volume failed: ${volumeFailed}`);
  console.log(`Skipped (already has values): ${skipped}`);
  console.log(`Documents updated: ${updated}`);

  process.exit(0);
}

backfillDimensions().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
