interface RelatedListing {
  price?: number;
  stockStatus?: string;
}

interface ProductWithRelatedListings {
  price?: number;
  stockStatus?: string;
  relatedListings?: RelatedListing[];
}

export interface BestPriceInfo {
  isBestPrice: boolean;
  savings: number | null;
  lowestPrice: number | null;
  competitorCount: number;
}

export function getBestPriceInfo(product: ProductWithRelatedListings): BestPriceInfo {
  const noMatch: BestPriceInfo = {
    isBestPrice: false,
    savings: null,
    lowestPrice: null,
    competitorCount: 0,
  };

  // Product must have a valid price and be in stock
  if (
    product.price == null ||
    product.stockStatus === "out_of_stock"
  ) {
    return noMatch;
  }

  // Must have related listings
  if (!product.relatedListings || product.relatedListings.length === 0) {
    return noMatch;
  }

  // Get in-stock competitor prices
  const competitorPrices = product.relatedListings
    .filter(
      (listing) =>
        listing.price != null &&
        listing.stockStatus !== "out_of_stock"
    )
    .map((listing) => listing.price!);

  // No in-stock competitors
  if (competitorPrices.length === 0) {
    return noMatch;
  }

  const lowestCompetitorPrice = Math.min(...competitorPrices);
  const highestCompetitorPrice = Math.max(...competitorPrices);
  const isBestPrice = product.price <= lowestCompetitorPrice;
  const savings = isBestPrice ? highestCompetitorPrice - product.price : null;

  return {
    isBestPrice,
    savings: savings && savings > 0 ? savings : null,
    lowestPrice: Math.min(product.price, lowestCompetitorPrice),
    competitorCount: competitorPrices.length,
  };
}
