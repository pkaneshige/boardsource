import { ContentSkeleton, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl">
      <Skeleton className="mb-6 h-10 w-2/3" />
      <ContentSkeleton lines={8} />
    </div>
  );
}
