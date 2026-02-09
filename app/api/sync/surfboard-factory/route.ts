/**
 * API endpoint for manually triggering Surfboard Factory Hawaii surfboard product sync
 *
 * POST /api/sync/surfboard-factory
 *
 * Protected by SYNC_API_KEY header authentication
 */

import { NextRequest, NextResponse } from "next/server";
import {
  syncSurfboardFactoryProducts,
  SURFBOARD_FACTORY_CATEGORY_IDS,
  type SurfboardFactorySyncOptions,
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
 * Validates that the category ID is a valid Surfboard Factory category
 */
function isValidCategoryId(categoryId: number): boolean {
  return (Object.values(SURFBOARD_FACTORY_CATEGORY_IDS) as number[]).includes(categoryId);
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
    const options: SurfboardFactorySyncOptions = {};

    try {
      const body = await request.json();
      if (body) {
        // Validate categoryId if provided
        if (body.categoryId !== undefined) {
          if (typeof body.categoryId !== "number" || !isValidCategoryId(body.categoryId)) {
            const validCategories = Object.entries(SURFBOARD_FACTORY_CATEGORY_IDS)
              .map(([name, id]) => `${name}: ${id}`)
              .join(", ");
            return NextResponse.json(
              {
                error: "Bad Request",
                message: `Invalid categoryId. Valid options are: ${validCategories}`,
              },
              { status: 400 }
            );
          }
          options.categoryId = body.categoryId;
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

    console.log("Starting Surfboard Factory sync with options:", options);

    // Run the sync
    const result = await syncSurfboardFactoryProducts(options);

    return NextResponse.json({
      success: true,
      message: "Surfboard Factory sync completed successfully",
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
    console.error("Surfboard Factory sync failed:", errorMessage);

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
