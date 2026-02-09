"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";

interface FilterControlsProps {
  categories: Array<{ value: string; label: string }>;
  sources: Array<{ value: string; label: string }>;
  shapers: string[];
  currentFilters: {
    category: string;
    minPrice: string;
    maxPrice: string;
    shaper: string;
    source: string;
    bestPrice: string;
    minLength: string;
    maxLength: string;
    minWidth: string;
    maxWidth: string;
    minThickness: string;
    maxThickness: string;
    minVolume: string;
    maxVolume: string;
  };
}

export function FilterControls({
  categories,
  sources,
  shapers,
  currentFilters,
}: FilterControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([name, value]) => {
        if (value && value !== "all" && value !== "") {
          params.set(name, value);
        } else {
          params.delete(name);
        }
      });

      return params.toString();
    },
    [searchParams]
  );

  const updateFilter = useCallback(
    (name: string, value: string) => {
      const queryString = createQueryString({ [name]: value });
      router.push(pathname + (queryString ? `?${queryString}` : ""));
    },
    [createQueryString, pathname, router]
  );

  const clearAllFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  const [showDimensions, setShowDimensions] = useState(
    !!(
      currentFilters.minLength ||
      currentFilters.maxLength ||
      currentFilters.minWidth ||
      currentFilters.maxWidth ||
      currentFilters.minThickness ||
      currentFilters.maxThickness ||
      currentFilters.minVolume ||
      currentFilters.maxVolume
    )
  );

  const hasActiveFilters =
    (currentFilters.category && currentFilters.category !== "all") ||
    currentFilters.minPrice ||
    currentFilters.maxPrice ||
    (currentFilters.shaper && currentFilters.shaper !== "all") ||
    (currentFilters.source && currentFilters.source !== "all") ||
    currentFilters.bestPrice === "true" ||
    currentFilters.minLength ||
    currentFilters.maxLength ||
    currentFilters.minWidth ||
    currentFilters.maxWidth ||
    currentFilters.minThickness ||
    currentFilters.maxThickness ||
    currentFilters.minVolume ||
    currentFilters.maxVolume;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex flex-wrap items-end gap-4">
        {/* Category Filter */}
        <div className="min-w-[150px] flex-1">
          <label
            htmlFor="category"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Category
          </label>
          <select
            id="category"
            value={currentFilters.category}
            onChange={(e) => updateFilter("category", e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range Filter */}
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Price Range
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                placeholder="Min"
                value={currentFilters.minPrice}
                onChange={(e) => updateFilter("minPrice", e.target.value)}
                min="0"
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-7 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <span className="text-gray-500 dark:text-gray-400">-</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                placeholder="Max"
                value={currentFilters.maxPrice}
                onChange={(e) => updateFilter("maxPrice", e.target.value)}
                min="0"
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-7 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Shaper Filter */}
        <div className="min-w-[150px] flex-1">
          <label
            htmlFor="shaper"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Shaper / Brand
          </label>
          <select
            id="shaper"
            value={currentFilters.shaper}
            onChange={(e) => updateFilter("shaper", e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="all">All Shapers</option>
            {shapers.map((shaper) => (
              <option key={shaper} value={shaper}>
                {shaper}
              </option>
            ))}
          </select>
        </div>

        {/* Source Filter */}
        <div className="min-w-[150px] flex-1">
          <label
            htmlFor="source"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Source
          </label>
          <select
            id="source"
            value={currentFilters.source}
            onChange={(e) => updateFilter("source", e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {sources.map((src) => (
              <option key={src.value} value={src.value}>
                {src.label}
              </option>
            ))}
          </select>
        </div>

        {/* Best Price Only Toggle */}
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={currentFilters.bestPrice === "true"}
              onChange={(e) =>
                updateFilter("bestPrice", e.target.checked ? "true" : "")
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900"
            />
            <span className="whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">
              Best Price Only
            </span>
          </label>
        </div>

        {/* Dimensions Toggle */}
        <div className="flex items-end pb-1">
          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {showDimensions ? "Hide" : "Show"} Dimensions
            <svg
              className={`h-4 w-4 transition-transform ${showDimensions ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Dimension Filters (collapsible) */}
      {showDimensions && (
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Length Filter (total inches) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Length (inches)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={currentFilters.minLength}
                  onChange={(e) => updateFilter("minLength", e.target.value)}
                  min="0"
                  step="1"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-gray-500 dark:text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={currentFilters.maxLength}
                  onChange={(e) => updateFilter("maxLength", e.target.value)}
                  min="0"
                  step="1"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Width Filter */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Width (inches)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={currentFilters.minWidth}
                  onChange={(e) => updateFilter("minWidth", e.target.value)}
                  min="0"
                  step="0.25"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-gray-500 dark:text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={currentFilters.maxWidth}
                  onChange={(e) => updateFilter("maxWidth", e.target.value)}
                  min="0"
                  step="0.25"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Thickness Filter */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Thickness (inches)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={currentFilters.minThickness}
                  onChange={(e) => updateFilter("minThickness", e.target.value)}
                  min="0"
                  step="0.125"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-gray-500 dark:text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={currentFilters.maxThickness}
                  onChange={(e) => updateFilter("maxThickness", e.target.value)}
                  min="0"
                  step="0.125"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Volume Filter */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Volume (liters)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={currentFilters.minVolume}
                  onChange={(e) => updateFilter("minVolume", e.target.value)}
                  min="0"
                  step="0.5"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-gray-500 dark:text-gray-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={currentFilters.maxVolume}
                  onChange={(e) => updateFilter("maxVolume", e.target.value)}
                  min="0"
                  step="0.5"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
