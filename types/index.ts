// TypeScript type definitions

import type { PortableTextBlock } from "@portabletext/types";

export interface Page {
  _id: string;
  _type: "page";
  title: string;
  slug: {
    current: string;
  };
  content: PortableTextBlock[];
}

export interface Announcement {
  _id: string;
  _type: "announcement";
  title: string;
  message: string;
  type: "info" | "warning" | "error";
  active: boolean;
}
