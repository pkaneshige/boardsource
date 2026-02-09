"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import type { PriceSnapshot } from "@/lib/cms/price-history";

type TimeRange = "30d" | "90d" | "all";

interface PriceHistoryChartProps {
  snapshots: PriceSnapshot[];
  currentPrice: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function filterByRange(snapshots: PriceSnapshot[], range: TimeRange): PriceSnapshot[] {
  if (range === "all") return snapshots;

  const days = range === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return snapshots.filter((s) => new Date(s.recordedAt) >= cutoff);
}

function computeStats(snapshots: PriceSnapshot[], currentPrice: number) {
  if (snapshots.length === 0) {
    return { low: null, high: null, avg: null, pctChange: null };
  }

  const prices = snapshots.map((s) => s.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  const firstPrice = snapshots[0].price;
  const pctChange = firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : null;

  return { low, high, avg, pctChange };
}

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

export function PriceHistoryChart({ snapshots, currentPrice }: PriceHistoryChartProps) {
  const [range, setRange] = useState<TimeRange>("90d");

  const filtered = useMemo(() => filterByRange(snapshots, range), [snapshots, range]);
  const stats = useMemo(() => computeStats(filtered, currentPrice), [filtered, currentPrice]);

  const chartData = useMemo(
    () =>
      filtered.map((s) => ({
        date: formatDate(s.recordedAt),
        fullDate: formatFullDate(s.recordedAt),
        price: s.price,
      })),
    [filtered]
  );

  if (snapshots.length < 2) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No price history available yet. Check back after the next sync.
      </p>
    );
  }

  const isAtAllTimeLow = stats.low != null && currentPrice <= stats.low;

  return (
    <div className="space-y-4">
      {/* Time range selector */}
      <div className="flex gap-1">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              range === opt.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {filtered.length < 2 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Not enough data for this time range. Try a longer period.
        </p>
      ) : (
        <div style={{ minHeight: 200 }}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(v: number) => `$${v}`}
                domain={["auto", "auto"]}
              />
              <Tooltip
                formatter={(value: number | undefined) => [
                  value != null ? formatCurrency(value) : "",
                  "Price",
                ]}
                labelFormatter={(_label, payload) => {
                  const item = payload?.[0]?.payload as
                    | { fullDate?: string }
                    | undefined;
                  return item?.fullDate ?? String(_label);
                }}
                contentStyle={{
                  backgroundColor: "var(--tooltip-bg, #fff)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                strokeWidth={2}
                dot={filtered.length <= 30}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.low != null && (
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <div className="flex items-center gap-1.5">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                All-Time Low
              </dt>
              {isAtAllTimeLow && <Badge variant="success">Now</Badge>}
            </div>
            <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(stats.low)}
            </dd>
          </div>
        )}
        {stats.high != null && (
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
              All-Time High
            </dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(stats.high)}
            </dd>
          </div>
        )}
        {stats.avg != null && (
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Average
            </dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(stats.avg)}
            </dd>
          </div>
        )}
        {stats.pctChange != null && (
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
              % Change
            </dt>
            <dd
              className={`mt-1 text-lg font-semibold ${
                stats.pctChange < 0
                  ? "text-green-600 dark:text-green-400"
                  : stats.pctChange > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-900 dark:text-white"
              }`}
            >
              {stats.pctChange > 0 ? "+" : ""}
              {stats.pctChange.toFixed(1)}%
            </dd>
          </div>
        )}
      </div>
    </div>
  );
}
