import { forwardRef, HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface CardSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface ContentSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  lines?: number;
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(({ className = "", ...props }, ref) => {
  const baseStyles = "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700";
  const combinedClassName = `${baseStyles} ${className}`.trim();

  return <div ref={ref} className={combinedClassName} {...props} />;
});

Skeleton.displayName = "Skeleton";

const CardSkeleton = forwardRef<HTMLDivElement, CardSkeletonProps>(
  ({ className = "", ...props }, ref) => {
    const baseStyles =
      "rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950";
    const combinedClassName = `${baseStyles} ${className}`.trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        <div className="space-y-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }
);

CardSkeleton.displayName = "CardSkeleton";

const ContentSkeleton = forwardRef<HTMLDivElement, ContentSkeletonProps>(
  ({ className = "", lines = 3, ...props }, ref) => {
    const baseStyles = "space-y-3";
    const combinedClassName = `${baseStyles} ${className}`.trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className={`h-4 ${index === lines - 1 ? "w-4/5" : "w-full"}`} />
        ))}
      </div>
    );
  }
);

ContentSkeleton.displayName = "ContentSkeleton";

export { Skeleton, CardSkeleton, ContentSkeleton };
export type { SkeletonProps, CardSkeletonProps, ContentSkeletonProps };
