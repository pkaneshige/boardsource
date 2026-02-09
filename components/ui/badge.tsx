import { forwardRef, HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`.trim();

    return (
      <span ref={ref} className={combinedClassName} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
export type { BadgeProps, BadgeVariant };
