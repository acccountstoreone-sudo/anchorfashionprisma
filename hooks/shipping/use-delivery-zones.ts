"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDeliveryZonesAction,
  calculateShippingRateAction,
  createDeliveryZoneAction,
  updateDeliveryZoneAction,
  createShippingRateAction,
} from "@/actions/delivery-zones.actions";

export const zoneKeys = {
  all: ["delivery-zones"] as const,
  list: () => ["delivery-zones", "list"] as const,
  rate: (params: Record<string, any>) => ["shipping-rate", params] as const,
};

export function useDeliveryZones() {
  return useQuery({
    queryKey: zoneKeys.list(),
    queryFn: async () => {
      const res = await fetchDeliveryZonesAction();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes — zones change infrequently
  });
}

export function useShippingRate(
  params: {
    district: string;
    city?: string;
    weightKg?: number;
    orderValue?: number;
    isCOD?: boolean;
  } | null
) {
  return useQuery({
    queryKey: zoneKeys.rate(params ?? {}),
    queryFn: async () => {
      const res = await calculateShippingRateAction(params as any);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!params?.district,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDeliveryZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await createDeliveryZoneAction(data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}

export function useUpdateDeliveryZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ zoneId, data }: { zoneId: string; data: any }) => {
      const res = await updateDeliveryZoneAction(zoneId, data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}

export function useCreateShippingRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await createShippingRateAction(data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}
