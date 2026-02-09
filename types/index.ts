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

export interface SanityImage {
  _type: "image";
  asset: {
    _ref: string;
    _type: "reference";
  };
}

export type SurfboardCategory =
  | "shortboard"
  | "longboard"
  | "funboard"
  | "fish"
  | "gun"
  | "mid-length"
  | "other";

export type StockStatus = "in_stock" | "out_of_stock" | "unknown";

export type SurfboardSource = "hawaiian-south-shore" | "surfgarage";

export interface SurfboardReference {
  _type: "reference";
  _ref: string;
}

export interface Surfboard {
  _id: string;
  _type: "surfboard";
  name: string;
  price?: number;
  images?: SanityImage[];
  dimensions?: string;
  volume?: string;
  shaper?: string;
  description?: string;
  sourceUrl?: string;
  sourceId?: string;
  source?: SurfboardSource;
  sourceName?: string;
  slug: {
    current: string;
  };
  lastScrapedAt?: string;
  category?: SurfboardCategory;
  stockStatus?: StockStatus;
  relatedListings?: SurfboardReference[];
}
