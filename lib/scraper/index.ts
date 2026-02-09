/**
 * Surfboard scraper module
 * Scrapes surfboard data from hawaiiansouthshore.com
 */

// Types
export type {
  ScrapedProduct,
  ShopifyProduct,
  ShopifyVariant,
  ShopifyImage,
  ShopifyProductsResponse,
  ProductListItem,
  SyncResult,
} from "./types";

// Squarespace types
export type {
  SquarespaceImage,
  SquarespaceVariant,
  SquarespaceProduct,
  SquarespaceCollection,
  SquarespaceCollectionResponse,
  SquarespaceProductResponse,
} from "./squarespace-types";

// Configuration
export {
  scraperConfig,
  urls,
  categoryTagMapping,
  productTypeMapping,
  parsePatterns,
  inferCategory,
  sleep,
  getRandomDelay,
} from "./config";

// List scraper
export { scrapeProductList } from "./list-scraper";
export type { ListScraperOptions } from "./list-scraper";

// Detail scraper
export { scrapeProductDetail, scrapeProductDetails } from "./detail-scraper";
export type { DetailScraperOptions } from "./detail-scraper";

// Sync orchestrator
export { syncAllProducts } from "./sync";
export type { SyncOptions } from "./sync";

// Surfgarage configuration
export {
  SURFGARAGE_BASE_URL,
  SURFGARAGE_SOURCE,
  SURFGARAGE_SOURCE_NAME,
  SURFGARAGE_CATEGORIES,
  CATEGORY_MAPPING,
  surfgarageRateLimit,
  SURFGARAGE_TIMEOUT_MS,
  surfgarageHeaders,
  surfgarageUrls,
  mapCategory,
  getSurfgarageRandomDelay,
} from "./surfgarage/config";
export type { SurfgarageCategory } from "./surfgarage/config";

// Surfgarage list scraper
export { scrapeSurfgarageList } from "./surfgarage/list-scraper";
export type { SurfgarageListScraperOptions } from "./surfgarage/list-scraper";

// Surfgarage detail scraper
export { scrapeSurfgarageDetail, scrapeSurfgarageDetails } from "./surfgarage/detail-scraper";
export type {
  SurfgarageDetailScraperOptions,
  SurfgarageProductInfo,
} from "./surfgarage/detail-scraper";

// Surfgarage sync orchestrator
export { syncSurfgarageProducts } from "./surfgarage/sync";
export type { SurfgarageSyncOptions } from "./surfgarage/sync";

// Surfboard Factory configuration
export {
  SURFBOARD_FACTORY_BASE_URL,
  SURFBOARD_FACTORY_API_URL,
  SURFBOARD_FACTORY_SOURCE,
  SURFBOARD_FACTORY_SOURCE_NAME,
  SURFBOARD_FACTORY_CATEGORY_IDS,
  SURFBOARD_FACTORY_CATEGORIES,
  CATEGORY_MAPPING as SURFBOARD_FACTORY_CATEGORY_MAPPING,
  surfboardFactoryRateLimit,
  surfboardFactoryPagination,
  SURFBOARD_FACTORY_TIMEOUT_MS,
  surfboardFactoryHeaders,
  surfboardFactoryUrls,
  mapCategory as mapSurfboardFactoryCategory,
  parseWooCommercePrice,
  generateSourceId as generateSurfboardFactorySourceId,
  getSurfboardFactoryRandomDelay,
} from "./surfboard-factory/config";
export type { SurfboardFactoryCategory } from "./surfboard-factory/config";

// Surfboard Factory types
export type {
  WooCommerceProduct,
  WooCommerceImage,
  WooCommerceCategory,
  WooCommerceBrand,
  WooCommercePrices,
  WooCommerceAttribute,
  WooCommerceProductsResponse,
  WooCommerceCategoryInfo,
} from "./surfboard-factory/types";

// Surfboard Factory list scraper
export { scrapeSurfboardFactoryList } from "./surfboard-factory/list-scraper";
export type { SurfboardFactoryListScraperOptions } from "./surfboard-factory/list-scraper";

// Surfboard Factory detail scraper
export {
  scrapeSurfboardFactoryDetail,
  scrapeSurfboardFactoryDetails,
} from "./surfboard-factory/detail-scraper";
export type { SurfboardFactoryDetailScraperOptions } from "./surfboard-factory/detail-scraper";

// Surfboard Factory sync orchestrator
export { syncSurfboardFactoryProducts } from "./surfboard-factory/sync";
export type { SurfboardFactorySyncOptions } from "./surfboard-factory/sync";

// Duplicate detection
export {
  findDuplicates,
  logMatchDetails,
  normalizeName,
  createComparisonKey,
  calculateSimilarity,
  normalizeDimensions,
  extractBrand,
  extractModel,
  extractProductSignature,
  compareSignatures,
  KNOWN_BRANDS,
  DEFAULT_MATCHER_CONFIG,
} from "./duplicate-detector";
export type {
  DuplicateMatch,
  DuplicateDetectorOptions,
  DuplicateMatcherConfig,
  NormalizedDimensions,
  ProductSignature,
  SignatureComparisonResult,
} from "./duplicate-detector";
