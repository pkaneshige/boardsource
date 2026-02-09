# Surfboard Factory Hawaii Scraper

## Site Information
- **URL**: https://www.surfboardfactoryhawaii.com
- **Platform**: WordPress + WooCommerce
- **Total Products**: ~329 (including accessories and surfboards)
- **Surfboards Only**: ~289

## API Analysis

### WooCommerce REST API v3 (`/wp-json/wc/v3/products`)
- **Status**: 401 Unauthorized
- **Authentication Required**: Yes (API keys needed)
- **Decision**: Not suitable for public scraping

### WooCommerce Store API v1 (`/wp-json/wc/store/v1/products`)
- **Status**: 200 OK
- **Authentication Required**: No
- **Decision**: **RECOMMENDED** - Use this API

## Chosen Approach: WooCommerce Store API v1

The Store API is publicly accessible and provides rich product data including:
- Product ID, name, slug, permalink
- Prices (with currency info, supports price ranges for variable products)
- Images (multiple per product with srcset)
- Categories (with hierarchy)
- Brands
- Attributes (Length, Width, Thickness, Volume, Tail, Fins, Finish)
- Variations (for variable products)
- Stock status

### Endpoints Used

1. **Products List**: `GET /wp-json/wc/store/v1/products`
   - Supports pagination via `page` and `per_page` params
   - Max 100 products per page
   - Response headers include `X-WP-Total` and `X-WP-TotalPages`

2. **Categories**: `GET /wp-json/wc/store/v1/products/categories`
   - Lists all product categories with parent relationships

3. **Filter by Category**: `GET /wp-json/wc/store/v1/products?category={category_id}`
   - Filter products by category ID

### Surfboard Categories

| Category | Slug | ID | Count |
|----------|------|-----|-------|
| Surfboards (parent) | surfboards | 22 | 289 |
| Groveler | groveler | 25 | 42 |
| High Performance | high-performance | 27 | 71 |
| Hybrid | hybrid | 24 | 64 |
| Longboard | longboard | 26 | 87 |
| Midlength | midlength-surfboards | 1764 | 26 |
| Used Surfboards | used-surfboards | 1034 | 4 |

### Non-Surfboard Categories (to exclude)
- Accessories (752)
- Softboards (694)
- Leashes (753)
- Wax (956)
- Traction Pads (952)

## Rate Limiting

- Recommend 2-3 second delay between requests
- Use pagination with 24 products per page (matching site display)

## Price Format

Prices are returned in cents (e.g., "72500" = $725.00)
- `currency_minor_unit: 2` indicates 2 decimal places
- Parse as: `parseInt(price) / 100`

## Example Product Response

```json
{
  "id": 19081,
  "name": "Chopper ACT",
  "slug": "torq-chopper-act",
  "permalink": "https://www.surfboardfactoryhawaii.com/product/torq-chopper-act/",
  "prices": {
    "price": "72500",
    "regular_price": "72500",
    "currency_code": "USD",
    "currency_minor_unit": 2
  },
  "images": [
    {
      "id": 19083,
      "src": "https://i0.wp.com/www.surfboardfactoryhawaii.com/...",
      "thumbnail": "...",
      "alt": ""
    }
  ],
  "categories": [
    { "id": 24, "name": "Hybrid", "slug": "hybrid" }
  ],
  "brands": [
    { "id": 1183, "name": "Torq", "slug": "torq" }
  ],
  "short_description": "<p>Product description HTML...</p>",
  "is_in_stock": true
}
```
