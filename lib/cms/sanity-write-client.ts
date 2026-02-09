import { createClient } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01";
const token = process.env.SANITY_API_TOKEN;

/**
 * Sanity client with write permissions.
 * Shared by write-client.ts and price-history.ts to avoid circular imports.
 */
export const sanityWriteClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});
