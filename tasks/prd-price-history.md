# PRD: Price History

## Introduction

Track surfboard price changes over time by recording price snapshots in Sanity whenever a product is synced, and display an interactive line chart on the product detail page. This lets users see whether a board's price is trending up, down, or stable before making a purchase decision.

Currently, the app only shows the current price. Users have no way to know if a board was recently discounted, if its price has been climbing, or what the historical low was. Price history solves this by storing a timestamped record of every price change and rendering it visually.

## Goals

- Record a price snapshot in Sanity each time a product is synced and the price has changed (or on first sync)
- Display a line chart of price history on the surfboard detail page
- Allow users to toggle between 30-day, 90-day, and all-time views
- Show summary stats: current price, all-time low, all-time high, and percentage change over the selected period

## User Stories

### US-001: Create priceSnapshot Sanity schema
**Description:** As a developer, I need a Sanity document type to store individual price snapshots so that price history data persists in the CMS.

**Acceptance Criteria:**
- [ ] Create `priceSnapshot` document type with fields: `surfboard` (reference to surfboard), `price` (number), `stockStatus` (string), `source` (string), `recordedAt` (datetime)
- [ ] Add schema to `lib/cms/schemas/index.ts` exports
- [ ] Index-friendly: `surfboard` reference and `recordedAt` datetime are both required fields
- [ ] Typecheck passes

### US-002: Record price snapshots during sync
**Description:** As a developer, I want the sync process to automatically record a price snapshot when a product's price changes so that history builds up passively with each scrape.

**Acceptance Criteria:**
- [ ] Create `lib/cms/price-history.ts` with a `recordPriceSnapshot(surfboardId, price, stockStatus, source)` function
- [ ] Function creates a new `priceSnapshot` document in Sanity with current timestamp
- [ ] Function checks the most recent snapshot for that surfboard; only creates a new one if the price or stockStatus has changed (avoids duplicate entries when price is unchanged)
- [ ] Integrate into `upsertSurfboard` in `write-client.ts`: after a successful upsert, call `recordPriceSnapshot` with the document ID and current price/status
- [ ] Typecheck passes

### US-003: Create price history query utility
**Description:** As a developer, I need a function to fetch price history for a surfboard within a given time range so the detail page can display it.

**Acceptance Criteria:**
- [ ] Create `lib/cms/price-history.ts` export: `getPriceHistory(surfboardId, days?)` that returns an array of `{ price, stockStatus, recordedAt }` sorted by `recordedAt` ascending
- [ ] When `days` is provided, filter to snapshots within the last N days; when omitted, return all snapshots
- [ ] Uses `sanityFetch` with a parameterized GROQ query
- [ ] Typecheck passes

### US-004: Build PriceHistoryChart client component
**Description:** As a user, I want to see a line chart showing how a surfboard's price has changed over time so I can decide if now is a good time to buy.

**Acceptance Criteria:**
- [ ] Create `app/surfboards/[slug]/price-history-chart.tsx` as a `"use client"` component
- [ ] Uses recharts `LineChart` with `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`
- [ ] X-axis shows dates, Y-axis shows price in USD
- [ ] Tooltip shows exact price and date on hover
- [ ] Chart is responsive and works on mobile (min-height 200px)
- [ ] Shows "No price history available" message when data is empty
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Add time range selector to chart
**Description:** As a user, I want to toggle between 30-day, 90-day, and all-time views so I can zoom into recent trends or see the full picture.

**Acceptance Criteria:**
- [ ] Add toggle buttons (30d / 90d / All) above the chart
- [ ] Selected range is visually highlighted (e.g., blue background)
- [ ] Changing range re-fetches data via a server action or client-side filtering
- [ ] Default to 90-day view
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Display price summary stats
**Description:** As a user, I want to see key price statistics (all-time low, high, average, percentage change) alongside the chart so I can quickly assess the deal.

**Acceptance Criteria:**
- [ ] Show stats below or beside the chart: All-Time Low, All-Time High, Average Price, and % Change over the selected period
- [ ] All-Time Low is highlighted in green if it equals the current price (meaning "this is the lowest it's ever been")
- [ ] Stats update when the time range changes
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Integrate price history into product detail page
**Description:** As a user, I want to see the price history chart on the surfboard detail page so I don't have to navigate elsewhere.

**Acceptance Criteria:**
- [ ] Add PriceHistoryChart section to `app/surfboards/[slug]/page.tsx` below the description and above the buy button
- [ ] Fetch initial 90-day price history server-side and pass as props
- [ ] Section has a heading "Price History"
- [ ] Only renders when there are 2+ price snapshots (a single data point isn't useful as a chart)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Create a `priceSnapshot` Sanity document type with fields: `surfboard` (reference), `price` (number), `stockStatus` (string), `source` (string), `recordedAt` (datetime, required)
- FR-2: When `upsertSurfboard` successfully creates or updates a surfboard document, check the latest snapshot price. If the price or stock status differs (or no snapshot exists), create a new `priceSnapshot` document
- FR-3: The `getPriceHistory` function must accept an optional `days` parameter and return snapshots sorted by `recordedAt` ascending
- FR-4: The chart component must use the `recharts` library to render a responsive line chart with date on the X-axis and price on the Y-axis
- FR-5: Time range toggle buttons (30d / 90d / All) must be present above the chart with the selected option visually indicated
- FR-6: Price summary stats (All-Time Low, All-Time High, Average, % Change) must be computed from the snapshot data and displayed alongside the chart
- FR-7: The price history section on the detail page must only render when 2 or more snapshots exist for the surfboard

## Non-Goals

- No price alert notifications (that's a separate future feature)
- No price predictions or forecasting
- No price history on the surfboard list/card view (detail page only)
- No manual price entry — all data comes from scraper syncs
- No price history for related listings shown on the same chart (each listing has its own history)

## Design Considerations

- Place the price history section between the description and the "Buy" button on the detail page
- Use a clean, minimal chart style that matches the existing dark/light mode theme
- Time range buttons should look like segmented controls (pill-shaped toggle group)
- Stats should be displayed in a compact grid (2x2 or 4-across on desktop)
- Reuse existing Badge component for "All-Time Low" highlight

## Technical Considerations

- **recharts** must be added as a dependency (`npm install recharts`). It's a popular React charting library that works well with Next.js and supports SSR-safe rendering via `ResponsiveContainer`
- Price snapshots are stored as separate Sanity documents (not embedded arrays) to avoid document size growth on the surfboard document
- GROQ query for price history should filter by surfboard reference and date range, e.g.: `*[_type == "priceSnapshot" && surfboard._ref == $id && recordedAt >= $since] | order(recordedAt asc)`
- The snapshot recording logic should be resilient — if it fails, the sync should still succeed (don't let price history recording break the scraper)
- For the time range toggle, pass all snapshots to the client and filter client-side (avoids extra API calls when toggling). Fetch all-time data server-side, then let the client component filter to 30d/90d/all

## Success Metrics

- Price snapshots are recorded for every price change during sync
- Users can view price trends on any product detail page after 2+ syncs
- Chart renders in under 500ms on the detail page
- Time range toggle is responsive and updates instantly (client-side filtering)

## Open Questions

- Should we add a "Price dropped!" badge on product cards when the latest price is lower than the previous snapshot? (Could be a follow-up enhancement)
- Should price history data ever be pruned (e.g., aggregate daily after 1 year)? For now, keep all data
