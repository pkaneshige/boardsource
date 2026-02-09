"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Something went wrong
          </h1>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            An unexpected error occurred. Our team has been notified and is working to fix the
            issue.
          </p>
          {error.message && (
            <p className="mt-3 rounded-md bg-gray-100 p-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {error.message}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-center gap-3">
          <Button onClick={reset} variant="primary">
            Try again
          </Button>
          <Button onClick={() => (window.location.href = "/dashboard")} variant="outline">
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
