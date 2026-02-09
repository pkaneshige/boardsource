import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

const baseStyles =
  "block w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const normalStyles =
  "border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400";

const errorStyles =
  "border-red-500 bg-white text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-red-400 dark:focus:ring-red-400";

const labelStyles = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

const errorMessageStyles = "mt-1 text-sm text-red-600 dark:text-red-400";

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const stateStyles = error ? errorStyles : normalStyles;
    const combinedClassName = `${baseStyles} ${stateStyles} ${className}`.trim();

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={combinedClassName}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={inputId ? `${inputId}-error` : undefined} className={errorMessageStyles}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
