"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTrackingTimelineAction,
  refreshTrackingAction,
} from "@/actions/shipping.actions";

export const trackingKeys = {
  timeline: (identifier: string) =>
    ["tracking", "timeline", identifier] as const,
};

export function useTracking(trackingNumber: string | undefined) {
  return useQuery({
    queryKey: trackingKeys.timeline(trackingNumber ?? ""),
    queryFn: async () => {
      const res = await getTrackingTimelineAction(trackingNumber!);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!trackingNumber && trackingNumber.length >= 3,
    staleTime: 60_000, // 1 minute
    refetchInterval: 120_000, // Auto-refresh every 2 minutes
  });
}

export function useRefreshTracking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const res = await refreshTrackingAction(shipmentId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.trackingNumber) {
        qc.setQueryData(trackingKeys.timeline(data.trackingNumber), data);
      }
    },
  });
}

/**
 * Client-side tracking fetch via the public API route (no auth).
 * Used by the customer tracking page.
 */
export function usePublicTracking(trackingNumber: string | undefined) {
  return useQuery({
    queryKey: ["public-tracking", trackingNumber],
    queryFn: async () => {
      const res = await fetch(`/api/shipping/track/${trackingNumber}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Tracking not found");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: !!trackingNumber && trackingNumber.length >= 3,
    staleTime: 60_000,
    retry: 1,
  });
}
