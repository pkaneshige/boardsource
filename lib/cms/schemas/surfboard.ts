import { defineField, defineType } from "sanity";

export const surfboard = defineType({
  name: "surfboard",
  title: "Surfboard",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "number",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [{ type: "image" }],
    }),
    defineField({
      name: "dimensions",
      title: "Dimensions",
      type: "string",
      description: 'Board dimensions (e.g., 6\'2" x 19" x 2.5")',
    }),
    defineField({
      name: "volume",
      title: "Volume",
      type: "string",
      description: "Board volume in liters (e.g., 32.5L)",
    }),
    defineField({
      name: "shaper",
      title: "Shaper",
      type: "string",
      description: "Brand or shaper name",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 5,
    }),
    defineField({
      name: "sourceUrl",
      title: "Source URL",
      type: "url",
      description: "Original product URL from Hawaiian South Shore",
    }),
    defineField({
      name: "sourceId",
      title: "Source ID",
      type: "string",
      description: "Unique identifier from source website",
    }),
    defineField({
      name: "source",
      title: "Source",
      type: "string",
      description: "Vendor source identifier",
      options: {
        list: [
          { title: "Hawaiian South Shore", value: "hawaiian-south-shore" },
          { title: "Surf Garage", value: "surfgarage" },
        ],
        layout: "dropdown",
      },
    }),
    defineField({
      name: "sourceName",
      title: "Source Name",
      type: "string",
      description: "Display name of the source vendor (e.g., 'Hawaiian South Shore')",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "lastScrapedAt",
      title: "Last Scraped At",
      type: "datetime",
      description: "When this product was last scraped from source",
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Shortboard", value: "shortboard" },
          { title: "Longboard", value: "longboard" },
          { title: "Funboard", value: "funboard" },
          { title: "Fish", value: "fish" },
          { title: "Gun", value: "gun" },
          { title: "Mid-Length", value: "mid-length" },
          { title: "Other", value: "other" },
        ],
        layout: "dropdown",
      },
    }),
    defineField({
      name: "stockStatus",
      title: "Stock Status",
      type: "string",
      options: {
        list: [
          { title: "In Stock", value: "in_stock" },
          { title: "Out of Stock", value: "out_of_stock" },
          { title: "Unknown", value: "unknown" },
        ],
        layout: "radio",
      },
      initialValue: "unknown",
    }),
    defineField({
      name: "relatedListings",
      title: "Related Listings",
      type: "array",
      description: "Duplicate listings of the same board from other vendors",
      of: [
        {
          type: "reference",
          to: [{ type: "surfboard" }],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: "name",
      shaper: "shaper",
      price: "price",
      media: "images.0",
    },
    prepare({ title, shaper, price, media }) {
      return {
        title,
        subtitle: `${shaper || "Unknown shaper"} - $${price || 0}`,
        media,
      };
    },
  },
});
