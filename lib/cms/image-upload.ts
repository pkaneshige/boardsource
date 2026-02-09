import { writeClient } from "./write-client";

/**
 * Result of an image upload operation
 */
export interface ImageUploadResult {
  success: boolean;
  assetRef: { _type: "reference"; _ref: string } | null;
  error?: string;
}

/**
 * Downloads an image from an external URL and uploads it to Sanity asset storage.
 *
 * @param imageUrl - The external URL of the image to upload
 * @param filename - Optional filename for the asset (defaults to extracted from URL)
 * @returns ImageUploadResult with asset reference on success, null on failure
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  filename?: string
): Promise<ImageUploadResult> {
  try {
    // Download the image from external URL
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      return {
        success: false,
        assetRef: null,
        error: `Failed to download image: HTTP ${response.status}`,
      };
    }

    // Get the content type from response headers
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract filename from URL if not provided
    const assetFilename = filename || extractFilenameFromUrl(imageUrl) || "product-image";

    // Upload to Sanity
    const asset = await writeClient.assets.upload("image", buffer, {
      filename: assetFilename,
      contentType,
    });

    return {
      success: true,
      assetRef: {
        _type: "reference",
        _ref: asset._id,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      assetRef: null,
      error: errorMessage,
    };
  }
}

/**
 * Extracts a filename from an image URL
 * @param url - The image URL
 * @returns Extracted filename or null
 */
function extractFilenameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Get the last segment of the path
    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      // Remove query params and clean up
      return lastSegment.split("?")[0].replace(/[^a-zA-Z0-9._-]/g, "_");
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Uploads multiple images from URLs to Sanity asset storage.
 * Processes images sequentially to avoid rate limiting.
 *
 * @param imageUrls - Array of external image URLs
 * @param onProgress - Optional callback for progress updates
 * @returns Array of ImageUploadResult for each image
 */
export async function uploadImagesFromUrls(
  imageUrls: string[],
  onProgress?: (completed: number, total: number, url: string) => void
): Promise<ImageUploadResult[]> {
  const results: ImageUploadResult[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    onProgress?.(i, imageUrls.length, url);

    const result = await uploadImageFromUrl(url);
    results.push(result);

    // Small delay between uploads to be respectful
    if (i < imageUrls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  onProgress?.(imageUrls.length, imageUrls.length, "complete");
  return results;
}
