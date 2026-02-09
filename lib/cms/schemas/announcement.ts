import { defineField, defineType } from "sanity";

export const announcement = defineType({
  name: "announcement",
  title: "Announcement",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "message",
      title: "Message",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Info", value: "info" },
          { title: "Warning", value: "warning" },
          { title: "Error", value: "error" },
        ],
        layout: "radio",
      },
      initialValue: "info",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      description: "Toggle to show or hide this announcement",
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: "title",
      type: "type",
      active: "active",
    },
    prepare({ title, type, active }) {
      return {
        title,
        subtitle: `${type || "info"} - ${active ? "Active" : "Inactive"}`,
      };
    },
  },
});
