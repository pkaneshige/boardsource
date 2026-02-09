import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import { sanityFetch } from "@/lib/cms";
import type { Page } from "@/types";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

const pageQuery = `*[_type == "page" && slug.current == $slug][0]{
  _id,
  _type,
  title,
  slug,
  content
}`;

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await sanityFetch<Page | null>(pageQuery, { slug });

  if (!page) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">{page.title}</h1>
      {page.content && (
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <PortableText value={page.content} />
        </div>
      )}
    </article>
  );
}
