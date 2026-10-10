"use client";

import { useState } from "react";
import { usePublicTracking } from "@/hooks/shipping/use-tracking";
import {
  CheckCircle2,
  Circle,
  Clock,
  Package,
  Truck,
  Home,
  XCircle,
  AlertTriangle,
} from "lucide-react";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  created: <Package className="h-5 w-5" />,
  pickup_requested: <Clock className="h-5 w-5" />,
  pickup_confirmed: <Clock className="h-5 w-5" />,
  picked_up: <Package className="h-5 w-5" />,
  in_transit: <Truck className="h-5 w-5" />,
  hub_received: <Truck className="h-5 w-5" />,
  out_for_delivery: <Truck className="h-5 w-5" />,
  delivered: <Home className="h-5 w-5" />,
  delivery_failed: <AlertTriangle className="h-5 w-5" />,
  returned_to_origin: <XCircle className="h-5 w-5" />,
  cancelled: <XCircle className="h-5 w-5" />,
};

export default function TrackOrderPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  const {
    data: timeline,
    isLoading,
    error,
  } = usePublicTracking(query || undefined);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(input.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-16 text-white">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm">
            <Truck className="h-4 w-4" />
            Real-time Tracking
          </div>
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">
            Track Your Order
          </h1>
          <p className="mb-8 text-lg text-slate-300">
            Enter your tracking number to see the latest delivery status
          </p>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter tracking number (e.g. SFT-1234567)"
              className="flex-1 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              type="submit"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Track
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto max-w-2xl px-4 py-12">
        {isLoading && (
          <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            Fetching tracking info…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-400" />
            <p className="font-medium text-red-600">Tracking not found</p>
            <p className="mt-1 text-sm text-red-400">
              Please check your tracking number and try again.
            </p>
          </div>
        )}

        {timeline && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Tracking Number
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-bold">
                    {timeline.trackingNumber ?? query}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                      timeline.currentStatus === "delivered"
                        ? "bg-green-100 text-green-700"
                        : [
                              "delivery_failed",
                              "returned_to_origin",
                              "cancelled",
                            ].includes(timeline.currentStatus)
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {timeline.currentStatus === "delivered" && (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {timeline.currentStatus?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              {timeline.estimatedDelivery && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Estimated delivery:{" "}
                  <strong>
                    {new Date(timeline.estimatedDelivery).toLocaleDateString(
                      "en-BD",
                      {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </strong>
                </div>
              )}
              <div className="mt-2 text-xs text-slate-400">
                via{" "}
                <span className="font-medium capitalize">
                  {timeline.courierName}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-6 font-semibold">Delivery Progress</h2>
              <div className="space-y-0">
                {timeline.events.map((event: any, index: number) => {
                  const isLast = index === timeline.events.length - 1;
                  return (
                    <div key={event.id} className="flex gap-4">
                      {/* Connector */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            event.isCompleted || event.isCurrent
                              ? event.isCurrent
                                ? "bg-blue-600 text-white ring-4 ring-blue-100"
                                : "bg-green-500 text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {event.isCompleted && !event.isCurrent ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            (STATUS_ICONS[event.status] ?? (
                              <Circle className="h-4 w-4" />
                            ))
                          )}
                        </div>
                        {!isLast && (
                          <div
                            className={`my-1 w-0.5 flex-1 ${event.isCompleted ? "bg-green-300" : "bg-slate-100"}`}
                            style={{ minHeight: "24px" }}
                          />
                        )}
                      </div>

                      {/* Event Content */}
                      <div className={`flex-1 pb-6 ${isLast ? "" : ""}`}>
                        <p
                          className={`font-medium ${event.isCurrent ? "text-blue-700" : event.isCompleted ? "text-slate-800" : "text-slate-400"}`}
                        >
                          {event.statusLabel}
                        </p>
                        {event.description && (
                          <p className="mt-0.5 text-sm text-slate-500">
                            {event.description}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-3">
                          {event.location && (
                            <span className="text-xs text-slate-400">
                              {event.location}
                            </span>
                          )}
                          {event.timestamp && (
                            <span className="text-xs text-slate-400">
                              {new Date(event.timestamp).toLocaleDateString(
                                "en-BD",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!query && !isLoading && (
          <div className="py-12 text-center text-slate-400">
            <Truck className="mx-auto mb-4 h-12 w-12 opacity-30" />
            <p>Enter your tracking number above to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
