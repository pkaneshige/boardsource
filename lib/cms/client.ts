import { createClient, type QueryParams } from "next-sanity";

// Environment variable configuration
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01";

// Create the Sanity client
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production",
});

/**
 * Type-safe query helper function for fetching data from Sanity
 * @param query - GROQ query string
 * @param params - Optional query parameters
 * @returns Promise with typed result
 */
export async function sanityFetch<T>(query: string, params?: QueryParams): Promise<T> {
  return client.fetch<T>(query, params ?? {});
}
