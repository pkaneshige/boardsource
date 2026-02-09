import imageUrlBuilder, { type SanityImageSource } from "@sanity/image-url";
import { client } from "./client";

const builder = imageUrlBuilder(client);

/**
 * Generates a URL for a Sanity image asset.
 * @param source - Sanity image reference
 * @returns Image URL builder for chaining transformations
 */
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
