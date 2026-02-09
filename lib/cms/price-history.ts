import { sanityFetch } from "./client";
import { sanityWriteClient } from "./sanity-write-client";

/**
 * A single price snapshot record
 */
export interface PriceSnapshot {
  price: number;
  stockStatus: string;
  recordedAt: string;
}

/**
 * Record a price snapshot for a surfboard if the price or stock status has changed.
 *
 * This function is resilient — it catches all errors internally so that
 * failures never break the sync process.
 */
export async function recordPriceSnapshot(
  surfboardId: string,
  price: number,
  stockStatus: string,
  source: string
): Promise<void> {
  try {
    // Fetch the most recent snapshot for this surfboard
    const latest = await sanityWriteClient.fetch<{
      price: number;
      stockStatus: string;
    } | null>(
      `*[_type == "priceSnapshot" && surfboard._ref == $id] | order(recordedAt desc)[0]{ price, stockStatus }`,
      { id: surfboardId }
    );

    // Skip if price and stock status are unchanged
    if (latest && latest.price === price && latest.stockStatus === stockStatus) {
      return;
    }

    // Create a new snapshot
    await sanityWriteClient.create({
      _type: "priceSnapshot",
      surfboard: {
        _type: "reference",
        _ref: surfboardId,
      },
      price,
      stockStatus,
      source,
      recordedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to record price snapshot for ${surfboardId}: ${message}`);
  }
}

/**
 * Fetch price history for a surfboard, optionally filtered to the last N days.
 *
 * @param surfboardId - Sanity document ID of the surfboard
 * @param days - Optional number of days to look back. Omit for all-time history.
 * @returns Array of price snapshots sorted by recordedAt ascending
 */
export async function getPriceHistory(
  surfboardId: string,
  days?: number
): Promise<PriceSnapshot[]> {
  if (days != null) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();

    return sanityFetch<PriceSnapshot[]>(
      `*[_type == "priceSnapshot" && surfboard._ref == $id && recordedAt >= $since] | order(recordedAt asc) { price, stockStatus, recordedAt }`,
      { id: surfboardId, since: sinceStr }
    );
  }

  return sanityFetch<PriceSnapshot[]>(
    `*[_type == "priceSnapshot" && surfboard._ref == $id] | order(recordedAt asc) { price, stockStatus, recordedAt }`,
    { id: surfboardId }
  );
}
