/**
 * API endpoint for manually triggering Surfgarage surfboard product sync
 *
 * POST /api/sync/surfgarage
 *
 * Protected by SYNC_API_KEY header authentication
 */

import { NextRequest, NextResponse } from "next/server";
import {
  syncSurfgarageProducts,
  SURFGARAGE_CATEGORIES,
  type SurfgarageSyncOptions,
  type SurfgarageCategory,
} from "@/lib/scraper";

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

/**
 * Validates that the category is a valid Surfgarage category
 */
function isValidCategory(category: string): category is SurfgarageCategory {
  return SURFGARAGE_CATEGORIES.includes(category as SurfgarageCategory);
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
    const options: SurfgarageSyncOptions = {};

    try {
      const body = await request.json();
      if (body) {
        // Validate category if provided
        if (body.category !== undefined) {
          if (typeof body.category !== "string" || !isValidCategory(body.category)) {
            return NextResponse.json(
              {
                error: "Bad Request",
                message: `Invalid category. Must be one of: ${SURFGARAGE_CATEGORIES.join(", ")}`,
              },
              { status: 400 }
            );
          }
          options.category = body.category;
        }

        // Apply other options
        if (body.maxProducts !== undefined) {
          options.maxProducts = body.maxProducts;
        }
        if (body.uploadImages !== undefined) {
          options.uploadImages = body.uploadImages;
        }
        if (body.markMissingAsOutOfStock !== undefined) {
          options.markMissingAsOutOfStock = body.markMissingAsOutOfStock;
        }
      }
    } catch {
      // No body or invalid JSON is fine, use defaults
    }

    console.log("Starting Surfgarage sync with options:", options);

    // Run the sync
    const result = await syncSurfgarageProducts(options);

    return NextResponse.json({
      success: true,
      message: "Surfgarage sync completed successfully",
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
    console.error("Surfgarage sync failed:", errorMessage);

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
