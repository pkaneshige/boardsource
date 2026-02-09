/**
 * API endpoint for manually triggering surfboard product sync
 *
 * POST /api/sync
 *
 * Protected by SYNC_API_KEY header authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { syncAllProducts, type SyncOptions } from "@/lib/scraper";

/**
 * Validates the API key from request headers
 */
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.SYNC_API_KEY;

  if (!expectedKey) {
    console.error("SYNC_API_KEY environment variable is not set");
    return false;
  }

  return apiKey === expectedKey;
}

export async function POST(request: NextRequest) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing API key" },
      { status: 401 }
    );
  }

  try {
    // Parse optional request body for sync options
    let options: SyncOptions = {};

    try {
      const body = await request.json();
      if (body) {
        options = {
          collection: body.collection,
          maxProducts: body.maxProducts,
          uploadImages: body.uploadImages,
          markMissingAsOutOfStock: body.markMissingAsOutOfStock,
        };
      }
    } catch {
      // No body or invalid JSON is fine, use defaults
    }

    console.log("Starting manual sync with options:", options);

    // Run the sync
    const result = await syncAllProducts(options);

    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      summary: {
        created: result.created,
        updated: result.updated,
        failed: result.failed,
        totalProcessed: result.created + result.updated + result.failed,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Sync failed:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: "Sync failed",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
