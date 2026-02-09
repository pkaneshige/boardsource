import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <svg
              className="h-8 w-8 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-6xl font-bold text-gray-900 dark:text-gray-100">404</h1>
          <h2 className="mt-2 text-xl font-semibold text-gray-700 dark:text-gray-300">
            Page not found
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved or
            deleted.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/dashboard">
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
