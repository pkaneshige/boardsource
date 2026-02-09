import { defineField, defineType } from "sanity";

export const notification = defineType({
  name: "notification",
  title: "Notification",
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
    }),
    defineField({
      name: "message",
      title: "Message",
      type: "string",
    }),
    defineField({
      name: "previousPrice",
      title: "Previous Price",
      type: "number",
    }),
    defineField({
      name: "newPrice",
      title: "New Price",
      type: "number",
    }),
    defineField({
      name: "read",
      title: "Read",
      type: "boolean",
      initialValue: false,
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
      message: "message",
      email: "email",
      read: "read",
    },
    prepare({ message, email, read }) {
      return {
        title: message || "Notification",
        subtitle: `${email} ${read ? "(read)" : "(unread)"}`,
      };
    },
  },
});
