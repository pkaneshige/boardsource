import Image from "next/image";
import Link from "next/link";
import { sanityFetch, urlFor } from "@/lib/cms";
import type { Surfboard, SurfboardCategory } from "@/types";
import { FilterControls } from "./filter-controls";
import { SearchInput } from "./search-input";
import { SortSelect, type SortOption } from "./sort-select";

interface SurfboardListItem {
  _id: string;
  name: string;
  price?: number;
  images?: Surfboard["images"];
  shaper?: string;
  slug: { current: string };
  category?: SurfboardCategory;
  sourceName?: string;
}

interface SearchParams {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  shaper?: string;
  source?: string;
  q?: string;
  sort?: SortOption;
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
    sourceName
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
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatPrice(surfboard.price)}
            </p>
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

  const hasActiveFilters = !!(
    (params.category && params.category !== "all") ||
    params.minPrice ||
    params.maxPrice ||
    (params.shaper && params.shaper !== "all") ||
    (params.source && params.source !== "all") ||
    params.q
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
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {surfboards.length} of {totalCount} boards
          {hasActiveFilters && (
            <span className="ml-1 text-blue-600 dark:text-blue-400">(filtered)</span>
          )}
        </div>
        <SortSelect currentSort={params.sort || "newest"} />
      </div>

      {surfboards.length === 0 ? (
        <EmptyState searchTerm={params.q} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {surfboards.map((surfboard) => (
            <ProductCard key={surfboard._id} surfboard={surfboard} />
          ))}
        </div>
      )}
    </div>
  );
}
