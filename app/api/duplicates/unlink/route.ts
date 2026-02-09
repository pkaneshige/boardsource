/**
 * API endpoint for manually unlinking duplicate surfboard listings
 *
 * POST /api/duplicates/unlink
 *
 * Protected by x-api-key header authentication
 *
 * Request body:
 * - productId1: string - First product's Sanity document ID
 * - productId2: string - Second product's Sanity document ID
 *
 * Removes the link between two products that were previously marked as related listings
 */

import { NextRequest, NextResponse } from "next/server";
import { unlinkRelatedListings, writeClient } from "@/lib/cms";

interface UnlinkRequestBody {
  productId1: string;
  productId2: string;
}

interface ProductInfo {
  _id: string;
  name: string;
}

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
 * Fetches product info for validation
 */
async function fetchProductInfo(productId: string): Promise<ProductInfo | null> {
  return writeClient.fetch<ProductInfo | null>(
    `*[_type == "surfboard" && _id == $id][0]{ _id, name }`,
    { id: productId }
  );
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
    // Parse request body
    let body: UnlinkRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid or missing request body" },
        { status: 400 }
      );
    }

    // Validate required fields
    const { productId1, productId2 } = body;

    if (!productId1 || !productId2) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Both productId1 and productId2 are required",
        },
        { status: 400 }
      );
    }

    if (productId1 === productId2) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Cannot unlink a product from itself",
        },
        { status: 400 }
      );
    }

    // Fetch both products to validate existence
    const [product1, product2] = await Promise.all([
      fetchProductInfo(productId1),
      fetchProductInfo(productId2),
    ]);

    // Validate both products exist
    if (!product1) {
      return NextResponse.json(
        {
          error: "Not Found",
          message: `Product with ID '${productId1}' not found`,
        },
        { status: 404 }
      );
    }

    if (!product2) {
      return NextResponse.json(
        {
          error: "Not Found",
          message: `Product with ID '${productId2}' not found`,
        },
        { status: 404 }
      );
    }

    // Unlink the products
    const success = await unlinkRelatedListings(productId1, productId2);

    if (!success) {
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: "Failed to unlink products",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Products unlinked successfully",
      unlinkedProducts: [
        { id: productId1, name: product1.name },
        { id: productId2, name: product2.name },
      ],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Unlink duplicates failed:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
