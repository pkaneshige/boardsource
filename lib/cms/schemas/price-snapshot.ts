import { defineField, defineType } from "sanity";

export const priceSnapshot = defineType({
  name: "priceSnapshot",
  title: "Price Snapshot",
  type: "document",
  fields: [
    defineField({
      name: "surfboard",
      title: "Surfboard",
      type: "reference",
      to: [{ type: "surfboard" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "number",
      validation: (rule) => rule.required().min(0),
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
      },
    }),
    defineField({
      name: "source",
      title: "Source",
      type: "string",
      description: "Vendor source identifier (e.g., hawaiian-south-shore)",
    }),
    defineField({
      name: "recordedAt",
      title: "Recorded At",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      surfboardName: "surfboard.name",
      price: "price",
      recordedAt: "recordedAt",
    },
    prepare({ surfboardName, price, recordedAt }) {
      return {
        title: `$${price ?? 0} - ${surfboardName || "Unknown"}`,
        subtitle: recordedAt
          ? new Date(recordedAt).toLocaleDateString()
          : "No date",
      };
    },
  },
});
