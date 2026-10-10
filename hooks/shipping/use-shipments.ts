"use client";

// ============================================================================
// Shipping Hooks — TanStack Query
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchShipmentsAction,
  fetchShipmentByIdAction,
  assignCourierAction,
  cancelShipmentAction,
  generateLabelAction,
  syncTrackingAction,
  refreshTrackingAction,
  createShipmentAction,
  reassignCourierAction,
} from "@/actions/shipping.actions";
import { ShipmentFilters } from "@/types/shipping.types";

// ============================================================================
// Query Keys
// ============================================================================

export const shipmentKeys = {
  all: ["shipments"] as const,
  list: (filters: ShipmentFilters) => ["shipments", "list", filters] as const,
  detail: (id: string) => ["shipments", "detail", id] as const,
};

// ============================================================================
// useShipments — List shipments with filters & pagination
// ============================================================================

export function useShipments(filters: ShipmentFilters = {}) {
  return useQuery({
    queryKey: shipmentKeys.list(filters),
    queryFn: async () => {
      const res = await fetchShipmentsAction(filters as any);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 30_000,
  });
}

// ============================================================================
// useShipmentDetail — Single shipment with all related data
// ============================================================================

export function useShipmentDetail(shipmentId: string | undefined) {
  return useQuery({
    queryKey: shipmentKeys.detail(shipmentId ?? ""),
    queryFn: async () => {
      const res = await fetchShipmentByIdAction(shipmentId!);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!shipmentId,
    staleTime: 15_000,
  });
}

// ============================================================================
// useAssignCourier
// ============================================================================

export function useAssignCourier() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      shipmentId: string;
      courierProviderCode: string;
      autoSubmit?: boolean;
    }) => {
      const res = await assignCourierAction(input as any);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: shipmentKeys.all });
      qc.invalidateQueries({
        queryKey: shipmentKeys.detail(variables.shipmentId),
      });
    },
  });
}

// ============================================================================
// useReassignCourier
// ============================================================================

export function useReassignCourier() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shipmentId,
      courierCode,
    }: {
      shipmentId: string;
      courierCode: string;
    }) => {
      const res = await reassignCourierAction(shipmentId, courierCode);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, { shipmentId }) => {
      qc.invalidateQueries({ queryKey: shipmentKeys.all });
      qc.invalidateQueries({ queryKey: shipmentKeys.detail(shipmentId) });
    },
  });
}

// ============================================================================
// useCancelShipment
// ============================================================================

export function useCancelShipment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shipmentId,
      reason,
    }: {
      shipmentId: string;
      reason?: string;
    }) => {
      const res = await cancelShipmentAction({ shipmentId, reason });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shipmentKeys.all });
    },
  });
}

// ============================================================================
// useGenerateLabel
// ============================================================================

export function useGenerateLabel() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const res = await generateLabelAction(shipmentId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, shipmentId) => {
      qc.invalidateQueries({ queryKey: shipmentKeys.detail(shipmentId) });
    },
  });
}

// ============================================================================
// useSyncTracking
// ============================================================================

export function useSyncTracking() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const res = await syncTrackingAction(shipmentId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, shipmentId) => {
      qc.invalidateQueries({ queryKey: shipmentKeys.detail(shipmentId) });
    },
  });
}

// ============================================================================
// useCreateShipment
// ============================================================================

export function useCreateShipment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const res = await createShipmentAction(input);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shipmentKeys.all });
    },
  });
}
