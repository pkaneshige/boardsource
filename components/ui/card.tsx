import { forwardRef, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", children, ...props }, ref) => {
    const baseStyles =
      "rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950";
    const combinedClassName = `${baseStyles} ${className}`.trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = "", children, ...props }, ref) => {
    const baseStyles = "flex flex-col space-y-1.5 p-6";
    const combinedClassName = `${baseStyles} ${className}`.trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = "", children, ...props }, ref) => {
    const baseStyles = "p-6 pt-0";
    const combinedClassName = `${baseStyles} ${className}`.trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = "", children, ...props }, ref) => {
    const baseStyles = "flex items-center p-6 pt-0";
    const combinedClassName = `${baseStyles} ${className}`.trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardContent, CardFooter };
export type { CardProps, CardHeaderProps, CardContentProps, CardFooterProps };
