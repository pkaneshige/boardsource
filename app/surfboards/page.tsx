import Image from "next/image";
import Link from "next/link";
import { sanityFetch, urlFor } from "@/lib/cms";
import { getBestPriceInfo } from "@/lib/utils/best-price";
import { Badge } from "@/components/ui/badge";
import type { Surfboard, SurfboardCategory } from "@/types";
import { FilterControls } from "./filter-controls";
import { SearchInput } from "./search-input";
import { SortSelect, type SortOption } from "./sort-select";

interface RelatedListingItem {
  _id: string;
  price?: number;
  stockStatus?: string;
  sourceName?: string;
}

interface SurfboardListItem {
  _id: string;
  name: string;
  price?: number;
  images?: Surfboard["images"];
  shaper?: string;
  slug: { current: string };
  category?: SurfboardCategory;
  sourceName?: string;
  stockStatus?: string;
  relatedListings?: RelatedListingItem[];
}

interface SearchParams {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  shaper?: string;
  source?: string;
  q?: string;
  sort?: SortOption;
  bestPrice?: string;
  minLength?: string;
  maxLength?: string;
  minWidth?: string;
  maxWidth?: string;
  minThickness?: string;
  maxThickness?: string;
  minVolume?: string;
  maxVolume?: string;
}

function getOrderClause(sort: SortOption | undefined): string {
  switch (sort) {
    case "price-asc":
      return "order(price asc)";
    case "price-desc":
      return "order(price desc)";
    case "name-asc":
      return "order(lower(name) asc)";
    case "newest":
    default:
      return "order(lastScrapedAt desc)";
  }
}

function buildGroqQuery(params: SearchParams): string {
  const conditions: string[] = ['_type == "surfboard"'];

  if (params.category && params.category !== "all") {
    conditions.push(`category == "${params.category}"`);
  }

  if (params.minPrice) {
    const min = parseFloat(params.minPrice);
    if (!isNaN(min)) {
      conditions.push(`price >= ${min}`);
    }
  }

  if (params.maxPrice) {
    const max = parseFloat(params.maxPrice);
    if (!isNaN(max)) {
      conditions.push(`price <= ${max}`);
    }
  }

  if (params.shaper && params.shaper !== "all") {
    conditions.push(`shaper == "${params.shaper}"`);
  }

  if (params.source && params.source !== "all") {
    conditions.push(`source == "${params.source}"`);
  }

  // Dimension filters
  if (params.minLength) {
    const min = parseFloat(params.minLength);
    if (!isNaN(min)) {
      conditions.push(`defined(lengthFeet) && (lengthFeet * 12 + lengthInches) >= ${min}`);
    }
  }
  if (params.maxLength) {
    const max = parseFloat(params.maxLength);
    if (!isNaN(max)) {
      conditions.push(`defined(lengthFeet) && (lengthFeet * 12 + lengthInches) <= ${max}`);
    }
  }
  if (params.minWidth) {
    const min = parseFloat(params.minWidth);
    if (!isNaN(min)) {
      conditions.push(`defined(widthInches) && widthInches >= ${min}`);
    }
  }
  if (params.maxWidth) {
    const max = parseFloat(params.maxWidth);
    if (!isNaN(max)) {
      conditions.push(`defined(widthInches) && widthInches <= ${max}`);
    }
  }
  if (params.minThickness) {
    const min = parseFloat(params.minThickness);
    if (!isNaN(min)) {
      conditions.push(`defined(thicknessInches) && thicknessInches >= ${min}`);
    }
  }
  if (params.maxThickness) {
    const max = parseFloat(params.maxThickness);
    if (!isNaN(max)) {
      conditions.push(`defined(thicknessInches) && thicknessInches <= ${max}`);
    }
  }
  if (params.minVolume) {
    const min = parseFloat(params.minVolume);
    if (!isNaN(min)) {
      conditions.push(`defined(volumeLiters) && volumeLiters >= ${min}`);
    }
  }
  if (params.maxVolume) {
    const max = parseFloat(params.maxVolume);
    if (!isNaN(max)) {
      conditions.push(`defined(volumeLiters) && volumeLiters <= ${max}`);
    }
  }

  // Search across name, shaper, and description fields
  if (params.q && params.q.trim()) {
    const searchTerm = params.q.trim();
    // Escape special characters in the search term for GROQ
    const escapedTerm = searchTerm.replace(/"/g, '\\"');
    conditions.push(
      `(name match "*${escapedTerm}*" || shaper match "*${escapedTerm}*" || description match "*${escapedTerm}*")`
    );
  }

  const orderClause = getOrderClause(params.sort);

  return `*[${conditions.join(" && ")}] | ${orderClause} {
    _id,
    name,
    price,
    images,
    shaper,
    slug,
    category,
    sourceName,
    stockStatus,
    relatedListings[]->{ _id, price, stockStatus, sourceName }
  }`;
}

async function getAvailableShapers(): Promise<string[]> {
  const shapers = await sanityFetch<Array<{ shaper: string }>>(
    `*[_type == "surfboard" && defined(shaper)] { shaper } | order(shaper asc)`
  );
  // Get unique shapers
  const uniqueShapers = [...new Set(shapers.map((s) => s.shaper).filter(Boolean))];
  return uniqueShapers.sort();
}

async function getTotalCount(): Promise<number> {
  const result = await sanityFetch<number>(`count(*[_type == "surfboard"])`);
  return result;
}

function formatPrice(price: number | undefined): string {
  if (price === undefined) return "Price TBD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

function ProductCard({ surfboard }: { surfboard: SurfboardListItem }) {
  const primaryImage = surfboard.images?.[0];
  const bestPriceInfo = getBestPriceInfo(surfboard);

  return (
    <Link href={`/surfboards/${surfboard.slug.current}`} className="group">
      <article className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-950">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-900">
          {primaryImage ? (
            <Image
              src={urlFor(primaryImage).width(400).height(300).url()}
              alt={surfboard.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-600">
              <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          {bestPriceInfo.isBestPrice && (
            <div className="absolute right-2 top-2">
              <Badge variant="success">Best Price</Badge>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {surfboard.name}
          </h3>
          {surfboard.shaper && (
            <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
              {surfboard.shaper}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatPrice(surfboard.price)}
              </p>
              {bestPriceInfo.savings != null && (
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  Save {formatPrice(bestPriceInfo.savings)}
                </p>
              )}
            </div>
            {surfboard.sourceName && (
              <span className="truncate rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {surfboard.sourceName}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

function EmptyState({ searchTerm }: { searchTerm?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="mb-4 h-16 w-16 text-gray-300 dark:text-gray-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {searchTerm ? "No results found" : "No surfboards found"}
      </h3>
      <p className="mt-1 text-gray-500 dark:text-gray-400">
        {searchTerm
          ? `No surfboards match "${searchTerm}". Try a different search term or adjust your filters.`
          : "Try adjusting your filters or check back soon for new arrivals."}
      </p>
    </div>
  );
}

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Categories" },
  { value: "shortboard", label: "Shortboard" },
  { value: "longboard", label: "Longboard" },
  { value: "funboard", label: "Funboard" },
  { value: "fish", label: "Fish" },
  { value: "gun", label: "Gun" },
  { value: "mid-length", label: "Mid-Length" },
  { value: "other", label: "Other" },
];

const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Sources" },
  { value: "hawaiian-south-shore", label: "Hawaiian South Shore" },
  { value: "surfboard-factory", label: "Surfboard Factory Hawaii" },
  { value: "surfgarage", label: "Surf Garage" },
];

export default async function SurfboardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = buildGroqQuery(params);

  const [surfboards, availableShapers, totalCount] = await Promise.all([
    sanityFetch<SurfboardListItem[]>(query),
    getAvailableShapers(),
    getTotalCount(),
  ]);

  // Apply client-side best price filter
  const bestPriceFilter = params.bestPrice === "true";
  let filteredSurfboards = bestPriceFilter
    ? surfboards.filter((s) => {
        const info = getBestPriceInfo(s);
        // Show if best price OR standalone (no related listings)
        return info.isBestPrice || !s.relatedListings || s.relatedListings.length === 0;
      })
    : surfboards;

  // Apply client-side savings sort
  if (params.sort === "savings") {
    filteredSurfboards = [...filteredSurfboards].sort((a, b) => {
      const aInfo = getBestPriceInfo(a);
      const bInfo = getBestPriceInfo(b);
      const aSavings = aInfo.savings ?? -1;
      const bSavings = bInfo.savings ?? -1;
      return bSavings - aSavings;
    });
  }

  const hasActiveFilters = !!(
    (params.category && params.category !== "all") ||
    params.minPrice ||
    params.maxPrice ||
    (params.shaper && params.shaper !== "all") ||
    (params.source && params.source !== "all") ||
    params.q ||
    params.bestPrice === "true" ||
    params.minLength ||
    params.maxLength ||
    params.minWidth ||
    params.maxWidth ||
    params.minThickness ||
    params.maxThickness ||
    params.minVolume ||
    params.maxVolume
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Surfboards</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Browse our collection of surfboards from Hawaiian South Shore.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <SearchInput initialValue={params.q || ""} />
        </div>
      </div>

      <FilterControls
        categories={CATEGORY_OPTIONS}
        sources={SOURCE_OPTIONS}
        shapers={availableShapers}
        currentFilters={{
          category: params.category || "all",
          minPrice: params.minPrice || "",
          maxPrice: params.maxPrice || "",
          shaper: params.shaper || "all",
          source: params.source || "all",
          bestPrice: params.bestPrice || "",
          minLength: params.minLength || "",
          maxLength: params.maxLength || "",
          minWidth: params.minWidth || "",
          maxWidth: params.maxWidth || "",
          minThickness: params.minThickness || "",
          maxThickness: params.maxThickness || "",
          minVolume: params.minVolume || "",
          maxVolume: params.maxVolume || "",
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredSurfboards.length} of {totalCount} boards
          {hasActiveFilters && (
            <span className="ml-1 text-blue-600 dark:text-blue-400">(filtered)</span>
          )}
        </div>
        <SortSelect currentSort={params.sort || "newest"} />
      </div>

      {filteredSurfboards.length === 0 ? (
        <EmptyState searchTerm={params.q} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSurfboards.map((surfboard) => (
            <ProductCard key={surfboard._id} surfboard={surfboard} />
          ))}
        </div>
      )}
    </div>
  );
}
