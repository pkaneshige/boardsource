# PRD: Dimension Search

## Introduction

Surfboard dimensions and volume are currently stored as raw strings in Sanity (e.g., `"5'8 x 20 13/16 x 2 1/4"`, `"28.8"`). Users cannot filter or search by these specs, even though dimensions are one of the most important criteria when shopping for a board. This feature adds structured numeric dimension fields to the Sanity schema, parses and backfills existing data, and adds dimension/volume filter controls to the product listing page so users can find boards matching their preferred specs.

## Goals

- Add structured numeric fields for length, width, thickness, and volume to the surfboard schema
- Parse existing dimension strings into structured numeric values during sync
- Backfill all existing products with parsed dimension data
- Add dimension and volume range filters to the product listing page
- Display parsed dimensions consistently on product detail pages

## User Stories

### US-001: Add structured dimension fields to Sanity schema
**Description:** As a developer, I need numeric dimension fields in the surfboard schema so dimensions can be queried and filtered.

**Acceptance Criteria:**
- [ ] Add `lengthFeet` (number), `lengthInches` (number), `widthInches` (number), `thicknessInches` (number), `volumeLiters` (number) fields to `lib/cms/schemas/surfboard.ts`
- [ ] Group these under a fieldset called "Parsed Dimensions" in the schema
- [ ] Add corresponding optional number fields to the `Surfboard` interface in `types/index.ts`
- [ ] Keep existing `dimensions` and `volume` string fields (they remain the raw source data)
- [ ] Typecheck passes

### US-002: Create dimension parsing utility
**Description:** As a developer, I need a utility to parse dimension strings into structured numeric values.

**Acceptance Criteria:**
- [ ] Create `lib/utils/parse-dimensions.ts` with `parseDimensionString(dimensions: string)` function
- [ ] Returns `{ lengthFeet: number, lengthInches: number, widthInches: number | null, thicknessInches: number | null }` or `null` if unparseable
- [ ] Handle formats: `"5'8 x 20 13/16 x 2 1/4"`, `"5'8 x 19.5 x 2.5"`, `"5'8"` (length only), `"5-8"`, `"5ft 8in"`
- [ ] Handle fractional inches: `"20 13/16"` -> `20.8125`, `"2 1/4"` -> `2.25`
- [ ] Create `parseVolumeString(volume: string)` that returns `number | null`
- [ ] Handle volume formats: `"28.8"`, `"28.8L"`, `"V28.8"`, `"volume: 28.8"`
- [ ] Typecheck passes

### US-003: Populate dimensions during Hawaiian South Shore sync
**Description:** As a developer, I need the Hawaiian South Shore sync to populate structured dimension fields.

**Acceptance Criteria:**
- [ ] Update `lib/scraper/detail-scraper.ts` to call `parseDimensionString()` and `parseVolumeString()` on scraped data
- [ ] Add parsed dimension fields to `ScrapedProduct` interface in `lib/scraper/types.ts`
- [ ] Update `upsertSurfboard()` in `lib/cms/write-client.ts` to write the new numeric fields
- [ ] Typecheck passes

### US-004: Populate dimensions during Surf Garage and Surfboard Factory sync
**Description:** As a developer, I need the other scrapers to also populate structured dimension fields.

**Acceptance Criteria:**
- [ ] Update `lib/scraper/surfgarage/detail-scraper.ts` to call `parseDimensionString()` and `parseVolumeString()`
- [ ] Update `lib/scraper/surfboard-factory/detail-scraper.ts` to call `parseDimensionString()` and `parseVolumeString()`
- [ ] Both scrapers set the same parsed fields on `ScrapedProduct`
- [ ] Typecheck passes

### US-005: Create backfill script for existing products
**Description:** As a developer, I need to parse dimensions for all existing products in Sanity that have dimension strings but no parsed values.

**Acceptance Criteria:**
- [ ] Create `scripts/backfill-dimensions.ts`
- [ ] Fetch all surfboards from Sanity that have `dimensions` or `volume` string fields
- [ ] Parse each product's dimension and volume strings using the parsing utility
- [ ] Update each product in Sanity with the parsed numeric fields
- [ ] Log summary: total processed, successfully parsed, failed to parse, skipped (already has values)
- [ ] Run with `npx tsx scripts/backfill-dimensions.ts`
- [ ] Typecheck passes

### US-006: Add dimension filters to the product listing page
**Description:** As a user, I want to filter surfboards by length, width, thickness, and volume so I can find boards matching my preferred specs.

**Acceptance Criteria:**
- [ ] Add Length filter to `filter-controls.tsx`: min/max inputs in feet-inches format (e.g., 5'6" to 6'2") or a dropdown with common length ranges
- [ ] Add Width filter: min/max inputs in inches (e.g., 18.5 to 21)
- [ ] Add Thickness filter: min/max inputs in inches (e.g., 2.25 to 2.75)
- [ ] Add Volume filter: min/max inputs in liters (e.g., 25 to 35)
- [ ] Update `SearchParams` interface and `buildGroqQuery()` in `page.tsx` to include dimension filters
- [ ] GROQ query filters on the numeric fields (e.g., `lengthFeet * 12 + lengthInches >= $minLength`)
- [ ] All dimension filters persist in URL search params
- [ ] Filters work in combination with all existing filters
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Add `lengthFeet`, `lengthInches`, `widthInches`, `thicknessInches`, `volumeLiters` number fields to the surfboard Sanity schema
- FR-2: Parse dimension strings like `"5'8 x 20 13/16 x 2 1/4"` into structured numeric values (lengthFeet=5, lengthInches=8, widthInches=20.8125, thicknessInches=2.25)
- FR-3: Parse volume strings like `"28.8"`, `"28.8L"`, `"V28.8"` into a numeric liters value
- FR-4: Populate parsed dimension fields during sync for all three scrapers
- FR-5: Backfill existing products with parsed dimensions via a one-time script
- FR-6: Filter products by length range (using feet-inches or total inches comparison)
- FR-7: Filter products by width, thickness, and volume ranges (numeric comparison)
- FR-8: All dimension filters are GROQ-based server-side filters, not client-side post-filtering

## Non-Goals

- No board recommendation engine or "find my ideal board" wizard (that's a future feature)
- No unit conversion (imperial/metric toggle)
- No dimension validation during manual Sanity Studio editing
- No display changes to the product detail page beyond what's already shown
- No fin setup or construction material filtering

## Design Considerations

- Dimension filters should follow the existing price range pattern (min/max number inputs)
- For length, consider a more user-friendly input format since surfers think in feet-inches (e.g., dropdown with 5'0" to 10'0" in 2" increments)
- Group dimension filters visually (e.g., collapsible "Dimensions" section) to avoid cluttering the filter bar
- Use placeholder text to show expected format/units (e.g., "Min (in)", "Min (L)")

## Technical Considerations

- The existing `normalizeDimensions()` in `duplicate-detector.ts` only extracts length — the new parser needs to extract all three dimensions (length, width, thickness)
- Dimension strings vary significantly across sources: Hawaiian South Shore uses fractions (`20 13/16`), others may use decimals (`19.5`)
- Volume is already stored as a fairly clean numeric string; parsing is straightforward
- GROQ supports numeric comparison operators (`>=`, `<=`) which work directly with the new numeric fields
- Length filtering requires combining `lengthFeet` and `lengthInches` in the GROQ query: `(lengthFeet * 12 + lengthInches)`
- Products without parsed dimensions should not be excluded by dimension filters — they should only be hidden when a dimension filter is actively set

## Success Metrics

- 90%+ of products with dimension strings are successfully parsed into structured fields
- Users can filter by any combination of length, width, thickness, and volume
- No regression in page load performance or existing filter behavior
- Dimension filters return accurate results matching the specified ranges

## Open Questions

- Should length filter use feet-inches dropdowns or free-form number inputs in total inches?
- What should happen when a dimension string is partially parseable (e.g., length found but not width/thickness)?
