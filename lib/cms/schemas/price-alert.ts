import { defineField, defineType } from "sanity";

export const priceAlert = defineType({
  name: "priceAlert",
  title: "Price Alert",
  type: "document",
  fields: [
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "surfboard",
      title: "Surfboard",
      type: "reference",
      to: [{ type: "surfboard" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "alertType",
      title: "Alert Type",
      type: "string",
      options: {
        list: [
          { title: "Price Drop", value: "price_drop" },
          { title: "Back in Stock", value: "back_in_stock" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "targetPrice",
      title: "Target Price",
      type: "number",
      description: "Alert when price drops to or below this amount (price_drop only)",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      email: "email",
      alertType: "alertType",
      surfboardName: "surfboard.name",
      active: "active",
    },
    prepare({ email, alertType, surfboardName, active }) {
      return {
        title: `${alertType === "price_drop" ? "Price Drop" : "Back in Stock"} - ${surfboardName || "Unknown"}`,
        subtitle: `${email} ${active ? "(active)" : "(inactive)"}`,
      };
    },
  },
});
