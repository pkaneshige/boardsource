import type { ScrapedProduct } from "@/lib/scraper";
import type { SurfboardCategory, StockStatus, SurfboardSource } from "@/types";
import { sanityWriteClient } from "./sanity-write-client";
import { recordPriceSnapshot } from "./price-history";

/**
 * Re-export the shared write client for backwards compatibility.
 */
export const writeClient = sanityWriteClient;

/**
 * Generates a URL-friendly slug from a product name.
 * @param name - Product name to slugify
 * @returns URL-friendly slug string
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Trim leading/trailing hyphens
    .slice(0, 96); // Max length per schema
}

/**
 * Result of an upsert operation
 */
export interface UpsertResult {
  success: boolean;
  documentId: string | null;
  created: boolean;
  error?: string;
}

/**
 * Document structure for creating/updating surfboard in Sanity
 */
interface SurfboardDocument {
  _type: "surfboard";
  name: string;
  price: number;
  dimensions?: string;
  volume?: string;
  lengthFeet?: number;
  lengthInches?: number;
  widthInches?: number;
  thicknessInches?: number;
  volumeLiters?: number;
  shaper: string;
  description: string;
  sourceUrl: string;
  sourceId: string;
  slug: { _type: "slug"; current: string };
  lastScrapedAt: string;
  category: SurfboardCategory;
  stockStatus: StockStatus;
  source: SurfboardSource;
  sourceName: string;
  images?: Array<{
    _type: "image";
    _key: string;
    asset: { _type: "reference"; _ref: string };
  }>;
}

/**
 * Upserts a surfboard document in Sanity based on sourceId.
 * Creates a new document if no matching sourceId exists, otherwise updates.
 *
 * @param product - Scraped product data to upsert
 * @param imageAssets - Optional array of Sanity asset references for images
 * @returns UpsertResult with success status and document info
 */
/**
 * Links two surfboard documents as related listings (duplicates from different vendors).
 * Updates both products' relatedListings arrays to reference each other.
 *
 * @param productId - First product's Sanity document ID
 * @param matchedProductId - Second product's Sanity document ID
 * @returns True if both updates succeeded, false otherwise
 */
export async function linkRelatedListings(
  productId: string,
  matchedProductId: string
): Promise<boolean> {
  try {
    // Fetch current relatedListings for both products
    const [productA, productB] = await Promise.all([
      writeClient.fetch<{ relatedListings?: Array<{ _ref: string }> } | null>(
        `*[_type == "surfboard" && _id == $id][0]{ relatedListings }`,
        { id: productId }
      ),
      writeClient.fetch<{ relatedListings?: Array<{ _ref: string }> } | null>(
        `*[_type == "surfboard" && _id == $id][0]{ relatedListings }`,
        { id: matchedProductId }
      ),
    ]);

    if (!productA || !productB) {
      console.error(`linkRelatedListings: Could not find one or both products`);
      return false;
    }

    // Check if already linked to avoid duplicates
    const aAlreadyLinked = productA.relatedListings?.some((ref) => ref._ref === matchedProductId);
    const bAlreadyLinked = productB.relatedListings?.some((ref) => ref._ref === productId);

    // Build updated relatedListings arrays
    const aRelated = productA.relatedListings || [];
    const bRelated = productB.relatedListings || [];

    // Generate unique key from the ref
    const generateKey = (ref: string) => ref.replace("drafts.", "").slice(0, 12);

    // Update product A's relatedListings if not already linked
    if (!aAlreadyLinked) {
      const newARelated = [
        ...aRelated,
        {
          _type: "reference" as const,
          _key: generateKey(matchedProductId),
          _ref: matchedProductId,
        },
      ];
      await writeClient.patch(productId).set({ relatedListings: newARelated }).commit();
    }

    // Update product B's relatedListings if not already linked
    if (!bAlreadyLinked) {
      const newBRelated = [
        ...bRelated,
        { _type: "reference" as const, _key: generateKey(productId), _ref: productId },
      ];
      await writeClient.patch(matchedProductId).set({ relatedListings: newBRelated }).commit();
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to link related listings: ${errorMessage}`);
    return false;
  }
}

/**
 * Unlinks two surfboard documents by removing them from each other's relatedListings.
 * Removes productId2 from productId1's relatedListings and vice versa.
 *
 * @param productId1 - First product's Sanity document ID
 * @param productId2 - Second product's Sanity document ID
 * @returns True if both updates succeeded, false otherwise
 */
export async function unlinkRelatedListings(
  productId1: string,
  productId2: string
): Promise<boolean> {
  try {
    // Fetch current relatedListings for both products
    const [productA, productB] = await Promise.all([
      writeClient.fetch<{ relatedListings?: Array<{ _ref: string; _key: string }> } | null>(
        `*[_type == "surfboard" && _id == $id][0]{ relatedListings }`,
        { id: productId1 }
      ),
      writeClient.fetch<{ relatedListings?: Array<{ _ref: string; _key: string }> } | null>(
        `*[_type == "surfboard" && _id == $id][0]{ relatedListings }`,
        { id: productId2 }
      ),
    ]);

    if (!productA || !productB) {
      console.error(`unlinkRelatedListings: Could not find one or both products`);
      return false;
    }

    // Filter out the references to each other
    const aFiltered = (productA.relatedListings || []).filter((ref) => ref._ref !== productId2);
    const bFiltered = (productB.relatedListings || []).filter((ref) => ref._ref !== productId1);

    // Update product A's relatedListings
    await writeClient.patch(productId1).set({ relatedListings: aFiltered }).commit();

    // Update product B's relatedListings
    await writeClient.patch(productId2).set({ relatedListings: bFiltered }).commit();

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to unlink related listings: ${errorMessage}`);
    return false;
  }
}

export async function upsertSurfboard(
  product: ScrapedProduct,
  imageAssets?: Array<{ _type: "reference"; _ref: string }>
): Promise<UpsertResult> {
  try {
    // Check if document exists with this sourceId
    const existingDoc = await writeClient.fetch<{ _id: string } | null>(
      `*[_type == "surfboard" && sourceId == $sourceId][0]{ _id }`,
      { sourceId: product.sourceId }
    );

    const slug = generateSlug(product.name);
    const now = new Date().toISOString();

    // Build the document data
    const documentData: SurfboardDocument = {
      _type: "surfboard",
      name: product.name,
      price: product.price,
      dimensions: product.dimensions || undefined,
      volume: product.volume || undefined,
      lengthFeet: product.lengthFeet,
      lengthInches: product.lengthInches,
      widthInches: product.widthInches,
      thicknessInches: product.thicknessInches,
      volumeLiters: product.volumeLiters,
      shaper: product.vendor,
      description: product.description,
      sourceUrl: product.sourceUrl,
      sourceId: product.sourceId,
      slug: { _type: "slug", current: slug },
      lastScrapedAt: now,
      category: product.category,
      stockStatus: product.stockStatus,
      source: product.source,
      sourceName: product.sourceName,
    };

    // Add images if provided
    if (imageAssets && imageAssets.length > 0) {
      documentData.images = imageAssets.map((asset) => ({
        _type: "image" as const,
        _key: asset._ref.replace("image-", "").slice(0, 12), // Generate unique key from ref
        asset,
      }));
    }

    if (existingDoc) {
      // Update existing document
      await writeClient.patch(existingDoc._id).set(documentData).commit();
      // Record price snapshot (resilient — won't throw)
      await recordPriceSnapshot(existingDoc._id, product.price, product.stockStatus, product.source);
      return {
        success: true,
        documentId: existingDoc._id,
        created: false,
      };
    } else {
      // Create new document
      const result = await writeClient.create(documentData);
      // Record initial price snapshot (resilient — won't throw)
      await recordPriceSnapshot(result._id, product.price, product.stockStatus, product.source);
      return {
        success: true,
        documentId: result._id,
        created: true,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      documentId: null,
      created: false,
      error: errorMessage,
    };
  }
}
