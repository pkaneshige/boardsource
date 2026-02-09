"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

interface HeaderProps {
  className?: string;
}

function Header({ className = "" }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Generate breadcrumb segments from pathname
  const pathSegments = pathname.split("/").filter(Boolean);

  return (
    <>
      <header
        className={`flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-900 lg:px-6 ${className}`}
      >
        {/* Mobile menu button - visible on small screens */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white lg:hidden"
          aria-label="Open sidebar"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Breadcrumbs placeholder */}
        <nav className="hidden items-center gap-2 text-sm lg:flex" aria-label="Breadcrumb">
          {pathSegments.map((segment, index) => {
            const href = "/" + pathSegments.slice(0, index + 1).join("/");
            const isLast = index === pathSegments.length - 1;
            const label = segment.charAt(0).toUpperCase() + segment.slice(1);

            return (
              <span key={href} className="flex items-center gap-2">
                {index > 0 && (
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
                {isLast ? (
                  <span className="text-gray-900 dark:text-white">{label}</span>
                ) : (
                  <Link
                    href={href}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        {/* Spacer for mobile (breadcrumbs hidden) */}
        <div className="flex-1 lg:hidden" />

        {/* Right side actions placeholder */}
        <div className="flex items-center gap-4">
          {/* Notification bell placeholder */}
          <button
            type="button"
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Notifications"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-900/50"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Sidebar drawer */}
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col">
            {/* Close button */}
            <div className="absolute right-0 top-0 -mr-12 pt-2">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Close sidebar"
              >
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Sidebar content */}
            <Sidebar className="h-full" />
          </div>
        </div>
      )}
    </>
  );
}

export { Header };
export type { HeaderProps };
