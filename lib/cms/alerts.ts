import { sanityWriteClient } from "./sanity-write-client";

interface ActiveAlert {
  _id: string;
  email: string;
  alertType: string;
  targetPrice?: number;
}

/**
 * Check active alerts for a surfboard and trigger any that match.
 *
 * - price_drop: triggers when newPrice <= targetPrice
 * - back_in_stock: triggers when stock changed from out_of_stock to in_stock
 *
 * Triggered alerts get a notification created and are deactivated (one-shot).
 * This function is resilient — it catches all errors internally.
 */
export async function checkAlerts(
  surfboardId: string,
  newPrice: number,
  newStockStatus: string,
  oldPrice?: number,
  oldStockStatus?: string
): Promise<void> {
  try {
    // Fetch all active alerts for this surfboard
    const alerts = await sanityWriteClient.fetch<ActiveAlert[]>(
      `*[_type == "priceAlert" && surfboard._ref == $id && active == true]{
        _id, email, alertType, targetPrice
      }`,
      { id: surfboardId }
    );

    if (alerts.length === 0) return;

    // Fetch surfboard name for notification message
    const surfboard = await sanityWriteClient.fetch<{ name: string } | null>(
      `*[_type == "surfboard" && _id == $id][0]{ name }`,
      { id: surfboardId }
    );
    const boardName = surfboard?.name || "Unknown board";

    for (const alert of alerts) {
      let shouldTrigger = false;
      let message = "";

      if (alert.alertType === "price_drop" && alert.targetPrice != null) {
        if (newPrice <= alert.targetPrice) {
          shouldTrigger = true;
          message = `${boardName} dropped to $${newPrice.toFixed(2)} (your target: $${alert.targetPrice.toFixed(2)})`;
        }
      } else if (alert.alertType === "back_in_stock") {
        if (oldStockStatus === "out_of_stock" && newStockStatus === "in_stock") {
          shouldTrigger = true;
          message = `${boardName} is back in stock at $${newPrice.toFixed(2)}`;
        }
      }

      if (shouldTrigger) {
        // Create notification
        await sanityWriteClient.create({
          _type: "notification",
          email: alert.email,
          surfboard: { _type: "reference", _ref: surfboardId },
          alertType: alert.alertType,
          message,
          previousPrice: oldPrice,
          newPrice,
          read: false,
          createdAt: new Date().toISOString(),
        });

        // Deactivate the alert (one-shot)
        await sanityWriteClient.patch(alert._id).set({ active: false }).commit();
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to check alerts for ${surfboardId}: ${message}`);
  }
}
