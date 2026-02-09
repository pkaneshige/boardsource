"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price (Low to High)" },
  { value: "price-desc", label: "Price (High to Low)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "savings", label: "Biggest Savings" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

interface SortSelectProps {
  currentSort: SortOption;
}

export function SortSelect({ currentSort }: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateSort = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value && value !== "newest") {
        params.set("sort", value);
      } else {
        params.delete("sort");
      }

      const queryString = params.toString();
      router.push(pathname + (queryString ? `?${queryString}` : ""));
    },
    [searchParams, pathname, router]
  );

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Sort by:
      </label>
      <select
        id="sort"
        value={currentSort}
        onChange={(e) => updateSort(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
