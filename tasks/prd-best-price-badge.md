# PRD: Best Price Badge

## Introduction

When the same surfboard is listed at multiple stores (e.g., Hawaiian South Shore, Surf Garage, Surfboard Factory Hawaii), users currently see an "Also available at" section on the detail page but have no quick way to identify which listing offers the best deal. This feature adds a "Best Price" badge to product cards and detail pages, a price comparison table on the detail page, and the ability to filter/sort by best price — helping users find the cheapest option at a glance.

## Goals

- Display a "Best Price" badge on product cards and detail pages when a listing has the lowest price among its related listings
- Only consider in-stock listings when determining best price
- Show a price comparison table on the detail page so users can compare all vendor prices side by side
- Allow users to filter the product list to show only best-priced listings
- Allow users to sort by savings amount (biggest price advantage first)

## User Stories

### US-001: Fetch relatedListings data in the product list query
**Description:** As a developer, I need relatedListings price and stock data available on the list page so the badge can be computed at query time.

**Acceptance Criteria:**
- [ ] Update the GROQ list query in `app/surfboards/page.tsx` to include `relatedListings[]->{ _id, price, stockStatus, sourceName }`
- [ ] Update the `SurfboardListItem` type to include the new relatedListings fields
- [ ] Existing list page rendering still works with no visual changes
- [ ] Typecheck passes

### US-002: Create best price utility function
**Description:** As a developer, I need a reusable function to determine whether a listing has the best price among its related listings.

**Acceptance Criteria:**
- [ ] Create `getBestPriceInfo(product)` function in `lib/utils/best-price.ts`
- [ ] Function accepts a product with `price`, `stockStatus`, and `relatedListings` (each with `price` and `stockStatus`)
- [ ] Returns `{ isBestPrice: boolean, savings: number | null, lowestPrice: number | null, competitorCount: number }`
- [ ] Only considers listings with `stockStatus !== 'out_of_stock'` and a valid price
- [ ] A product with no relatedListings or no in-stock competitors returns `{ isBestPrice: false, savings: null, lowestPrice: null, competitorCount: 0 }`
- [ ] When two listings have the same price, both are considered "best price"
- [ ] `savings` is the difference between the highest competitor price and this listing's price (shows how much the user saves)
- [ ] Typecheck passes

### US-003: Add Best Price badge to product cards
**Description:** As a user, I want to see a "Best Price" badge on product cards so I can quickly identify the cheapest listing without clicking into each one.

**Acceptance Criteria:**
- [ ] Product cards show a green "Best Price" badge (using existing `Badge` component with `variant="success"`) when `getBestPriceInfo()` returns `isBestPrice: true`
- [ ] Badge is positioned in the top-right corner of the card image area
- [ ] If savings amount is available, badge shows "Best Price" with savings displayed below the price (e.g., "Save $50")
- [ ] Badge does not appear on products with no related listings
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Enhance detail page with price comparison table
**Description:** As a user, I want to compare prices across all vendors on the detail page so I can make an informed purchase decision.

**Acceptance Criteria:**
- [ ] Replace the existing "Also available at" list with a "Price Comparison" section
- [ ] Show a table/list with columns: Vendor, Price, Stock Status, and a "Buy" link
- [ ] Include the current listing in the comparison (not just relatedListings)
- [ ] Highlight the row with the lowest price using a green background or border
- [ ] Sort listings by price ascending (cheapest first)
- [ ] Out-of-stock listings appear at the bottom, grayed out with "Out of Stock" text
- [ ] Each row links to the respective product's detail page (for related listings) or shows "Buy Now" linking to sourceUrl (for current listing)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Add "Best Price Only" filter
**Description:** As a user, I want to filter the product list to show only best-priced listings so I can browse without seeing duplicate higher-priced options.

**Acceptance Criteria:**
- [ ] Add a "Best Price Only" toggle/checkbox to the filter controls in `app/surfboards/filter-controls.tsx`
- [ ] When enabled, only show products where `getBestPriceInfo()` returns `isBestPrice: true`, plus products with no related listings (standalone products)
- [ ] Filter state is stored in URL search params as `bestPrice=true`
- [ ] Update `buildGroqQuery()` or apply client-side post-filtering to support this filter
- [ ] Filter works in combination with all existing filters (category, price range, shaper, source)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Add "Savings" sort option
**Description:** As a user, I want to sort products by savings amount so I can find boards where this vendor offers the biggest price advantage.

**Acceptance Criteria:**
- [ ] Add "Biggest Savings" option to the sort dropdown in `app/surfboards/sort-select.tsx`
- [ ] Sorts products by savings amount descending (largest savings first)
- [ ] Products with no savings (no related listings or not best price) appear at the bottom
- [ ] This is a client-side sort applied after GROQ query results return (since savings is computed, not stored)
- [ ] Sort persists in URL search params as `sort=savings`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Compute best price at query time by comparing the current listing's price against all in-stock relatedListings prices
- FR-2: Display a green "Best Price" badge on product cards when the listing has the lowest or tied-lowest price
- FR-3: Show savings amount on product cards (e.g., "Save $50") when there is a price difference
- FR-4: Display a price comparison section on the product detail page listing all vendors, prices, and stock status for the same board
- FR-5: Highlight the best-priced row in the comparison table
- FR-6: Sort the comparison table by price ascending, with out-of-stock items at the bottom
- FR-7: Provide a "Best Price Only" filter toggle that hides higher-priced duplicate listings
- FR-8: Provide a "Biggest Savings" sort option that orders products by savings amount

## Non-Goals

- No price alerts or notifications when prices change
- No historical price tracking or price trend display
- No pre-computed best price fields stored in Sanity (computed at query time)
- No "price match" or external price comparison with sites not in the catalog
- No automatic redirecting users to the cheapest vendor

## Design Considerations

- Reuse the existing `Badge` component with `variant="success"` for the Best Price badge
- Position the badge absolutely in the top-right of the product card image container, consistent with common e-commerce patterns
- The price comparison table on the detail page should replace the existing "Also available at" section, not duplicate it
- Use green highlighting (border or background) for the best price row in the comparison table
- Gray out out-of-stock rows to clearly indicate unavailability
- The "Best Price Only" filter should be a simple toggle/checkbox, visually distinct from the dropdown filters

## Technical Considerations

- The `relatedListings` field is an array of Sanity references; dereferencing with `relatedListings[]->{ ... }` adds a small query overhead on the list page
- Best price computation is lightweight (comparing a handful of prices per product) and safe to do at render time
- The "Best Price Only" filter and "Biggest Savings" sort may need client-side post-processing since savings is a computed value not stored in Sanity
- Consider the edge case where a product's own price is null/undefined — it should not show a Best Price badge
- Products with `stockStatus === 'out_of_stock'` should never show a Best Price badge even if their price is lowest

## Success Metrics

- Users can identify the cheapest listing for any board in under 2 seconds from the product list
- Price comparison table shows all vendor options on a single detail page
- "Best Price Only" filter reduces visual clutter from duplicate listings
- No regression in page load performance on the product list page

## Open Questions

- Should the savings text show absolute amount ("Save $50") or percentage ("Save 15%") or both?
- Should products where the current listing is out of stock but has a cheaper price still show "Best Price" badge on other in-stock listings?
