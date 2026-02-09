import { defineField, defineType } from "sanity";

export const navigationItem = defineType({
  name: "navigationItem",
  title: "Navigation Item",
  type: "document",
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      description: "The text displayed for this navigation item",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "href",
      title: "Link URL",
      type: "string",
      description: "The URL or path this item links to (e.g., /dashboard/settings)",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "icon",
      title: "Icon",
      type: "string",
      description: "Icon identifier (e.g., home, settings, users, chart)",
      options: {
        list: [
          { title: "Home", value: "home" },
          { title: "Settings", value: "settings" },
          { title: "Users", value: "users" },
          { title: "Chart", value: "chart" },
          { title: "Document", value: "document" },
          { title: "Folder", value: "folder" },
          { title: "Bell", value: "bell" },
          { title: "Calendar", value: "calendar" },
        ],
      },
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "Display order in navigation (lower numbers appear first)",
      initialValue: 0,
      validation: (rule) => rule.required().integer().min(0),
    }),
  ],
  orderings: [
    {
      title: "Order",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "label",
      href: "href",
      order: "order",
    },
    prepare({ title, href, order }) {
      return {
        title,
        subtitle: `${href} (order: ${order ?? 0})`,
      };
    },
  },
});
