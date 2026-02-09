import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sanityFetch, urlFor } from "@/lib/cms";
import type { Surfboard } from "@/types";

const SURFBOARD_BY_SLUG_QUERY = `*[_type == "surfboard" && slug.current == $slug][0] {
  _id,
  name,
  price,
  images,
  dimensions,
  volume,
  shaper,
  description,
  sourceUrl,
  source,
  sourceName,
  category,
  stockStatus,
  relatedListings[]->{
    _id,
    name,
    price,
    sourceName,
    "slug": slug.current
  }
}`;

interface RelatedListing {
  _id: string;
  name: string;
  price?: number;
  sourceName?: string;
  slug: string;
}

interface SurfboardDetailItem {
  _id: string;
  name: string;
  price?: number;
  images?: Surfboard["images"];
  dimensions?: string;
  volume?: string;
  shaper?: string;
  description?: string;
  sourceUrl?: string;
  source?: string;
  sourceName?: string;
  category?: Surfboard["category"];
  stockStatus?: Surfboard["stockStatus"];
  relatedListings?: RelatedListing[];
}

function formatPrice(price: number | undefined): string {
  if (price === undefined) return "Price TBD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

function formatCategory(category: string | undefined): string {
  if (!category) return "";
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ImageGallery({ images, name }: { images?: Surfboard["images"]; name: string }) {
  if (!images || images.length === 0) {
    return (
      <div className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <svg
          className="h-24 w-24 text-gray-400 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
        <Image
          src={urlFor(images[0]).width(800).height(800).url()}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
        <Image
          src={urlFor(images[0]).width(800).height(800).url()}
          alt={`${name} - Main image`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {images.slice(1, 5).map((image, index) => (
          <div
            key={image.asset._ref}
            className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900"
          >
            <Image
              src={urlFor(image).width(200).height(200).url()}
              alt={`${name} - Image ${index + 2}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 25vw, 12vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function SurfboardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const surfboard = await sanityFetch<SurfboardDetailItem | null>(SURFBOARD_BY_SLUG_QUERY, {
    slug,
  });

  if (!surfboard) {
    notFound();
  }

  const isOutOfStock = surfboard.stockStatus === "out_of_stock";

  return (
    <div className="space-y-6">
      <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/surfboards" className="hover:text-gray-700 dark:hover:text-gray-200">
          Surfboards
        </Link>
        <span>/</span>
        <span className="truncate text-gray-900 dark:text-white">{surfboard.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ImageGallery images={surfboard.images} name={surfboard.name} />

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white lg:text-3xl">
              {surfboard.name}
            </h1>
            {surfboard.shaper && (
              <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">{surfboard.shaper}</p>
            )}
            {surfboard.sourceName && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                Available at {surfboard.sourceName}
              </p>
            )}
          </div>

          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatPrice(surfboard.price)}
            </span>
            {isOutOfStock && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                Out of Stock
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {surfboard.dimensions && (
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Dimensions</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {surfboard.dimensions}
                </dd>
              </div>
            )}
            {surfboard.volume && (
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Volume</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {surfboard.volume}
                </dd>
              </div>
            )}
            {surfboard.category && (
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCategory(surfboard.category)}
                </dd>
              </div>
            )}
          </div>

          {surfboard.description && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Description</h2>
              <p className="mt-2 whitespace-pre-line text-gray-600 dark:text-gray-400">
                {surfboard.description}
              </p>
            </div>
          )}

          {surfboard.sourceUrl && (
            <a
              href={surfboard.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              {surfboard.sourceName ? `Buy at ${surfboard.sourceName}` : "Buy Now"}
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}

          {surfboard.relatedListings && surfboard.relatedListings.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Also available at
              </h3>
              <ul className="mt-3 space-y-2">
                {surfboard.relatedListings.map((listing) => (
                  <li key={listing._id}>
                    <Link
                      href={`/surfboards/${listing.slug}`}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-gray-700"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {listing.sourceName || "Other Vendor"}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatPrice(listing.price)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
