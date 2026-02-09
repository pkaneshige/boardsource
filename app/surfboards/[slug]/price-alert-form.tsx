"use client";

import { useState, useEffect } from "react";

interface PriceAlertFormProps {
  surfboardId: string;
  currentPrice: number;
  stockStatus: string;
}

const ALERT_EMAIL_KEY = "boardsource_alert_email";

export function PriceAlertForm({
  surfboardId,
  currentPrice,
  stockStatus,
}: PriceAlertFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [alertType, setAlertType] = useState<"price_drop" | "back_in_stock">("price_drop");
  const [targetPrice, setTargetPrice] = useState(
    Math.round(currentPrice * 0.9)
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isOutOfStock = stockStatus === "out_of_stock";

  useEffect(() => {
    const saved = localStorage.getItem(ALERT_EMAIL_KEY);
    if (saved) setEmail(saved);
    if (isOutOfStock) setAlertType("back_in_stock");
  }, [isOutOfStock]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    // Save email for next time
    localStorage.setItem(ALERT_EMAIL_KEY, email);

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          surfboardId,
          alertType,
          targetPrice: alertType === "price_drop" ? targetPrice : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create alert");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <p className="text-sm font-medium text-green-800 dark:text-green-300">
          Alert set! We&apos;ll notify you at {email} when{" "}
          {alertType === "price_drop"
            ? `the price drops to $${targetPrice} or below`
            : "this board is back in stock"}
          .
        </p>
        <button
          onClick={() => {
            setStatus("idle");
            setIsOpen(false);
          }}
          className="mt-2 text-sm text-green-600 underline hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
        >
          Set another alert
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        Set Price Alert
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Set Price Alert
        </h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div>
        <label htmlFor="alert-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <input
          id="alert-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Alert Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="alertType"
              value="price_drop"
              checked={alertType === "price_drop"}
              onChange={() => setAlertType("price_drop")}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Price Drop</span>
          </label>
          {isOutOfStock && (
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="alertType"
                value="back_in_stock"
                checked={alertType === "back_in_stock"}
                onChange={() => setAlertType("back_in_stock")}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Back in Stock</span>
            </label>
          )}
        </div>
      </div>

      {alertType === "price_drop" && (
        <div>
          <label htmlFor="target-price" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Target Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              id="target-price"
              type="number"
              required
              min="1"
              step="1"
              value={targetPrice}
              onChange={(e) => setTargetPrice(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-7 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Alert when price drops to ${targetPrice} or below
          </p>
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "loading" ? "Setting alert..." : "Create Alert"}
      </button>
    </form>
  );
}
