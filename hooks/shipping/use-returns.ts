"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchReturnsAction,
  fetchReturnByIdAction,
  createReturnRequestAction,
  approveReturnAction,
  rejectReturnAction,
  markReturnReceivedAction,
  syncReturnInventoryAction,
  completeReturnAction,
} from "@/actions/returns.actions";
import { ReturnFilters } from "@/types/shipping.types";

export const returnKeys = {
  all: ["returns"] as const,
  list: (filters: ReturnFilters) => ["returns", "list", filters] as const,
  detail: (id: string) => ["returns", "detail", id] as const,
};

export function useReturns(filters: ReturnFilters = {}) {
  return useQuery({
    queryKey: returnKeys.list(filters),
    queryFn: async () => {
      const res = await fetchReturnsAction(filters as any);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useReturnDetail(returnId: string | undefined) {
  return useQuery({
    queryKey: returnKeys.detail(returnId ?? ""),
    queryFn: async () => {
      const res = await fetchReturnByIdAction(returnId!);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!returnId,
    staleTime: 15_000,
  });
}

export function useCreateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const res = await createReturnRequestAction(input);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: returnKeys.all }),
  });
}

export function useApproveReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (returnId: string) => {
      const res = await approveReturnAction(returnId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, returnId) => {
      qc.invalidateQueries({ queryKey: returnKeys.all });
      qc.invalidateQueries({ queryKey: returnKeys.detail(returnId) });
    },
  });
}

export function useRejectReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      returnId,
      reason,
    }: {
      returnId: string;
      reason: string;
    }) => {
      const res = await rejectReturnAction(returnId, reason);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, { returnId }) => {
      qc.invalidateQueries({ queryKey: returnKeys.all });
      qc.invalidateQueries({ queryKey: returnKeys.detail(returnId) });
    },
  });
}

export function useMarkReturnReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (returnId: string) => {
      const res = await markReturnReceivedAction(returnId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, returnId) => {
      qc.invalidateQueries({ queryKey: returnKeys.all });
      qc.invalidateQueries({ queryKey: returnKeys.detail(returnId) });
    },
  });
}

export function useSyncReturnInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (returnId: string) => {
      const res = await syncReturnInventoryAction(returnId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, returnId) => {
      qc.invalidateQueries({ queryKey: returnKeys.all });
      qc.invalidateQueries({ queryKey: returnKeys.detail(returnId) });
    },
  });
}

export function useCompleteReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (returnId: string) => {
      const res = await completeReturnAction(returnId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, returnId) => {
      qc.invalidateQueries({ queryKey: returnKeys.all });
      qc.invalidateQueries({ queryKey: returnKeys.detail(returnId) });
    },
  });
}

export function useProcessReturnRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (returnId: string) => {
      const { processReturnRefundAction } = await import(
        "@/actions/returns.actions"
      );
      const res = await processReturnRefundAction(returnId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, returnId) => {
      qc.invalidateQueries({ queryKey: returnKeys.all });
      qc.invalidateQueries({ queryKey: returnKeys.detail(returnId) });
    },
  });
}

export function useResolveReturnRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      returnId,
      refundMethod,
      note,
    }: {
      returnId: string;
      refundMethod?: "WALLET" | "MANUAL_BANK" | "MANUAL_CASH" | "GATEWAY_CONFIRMED";
      note?: string;
    }) => {
      const { resolveReturnRefundAction } = await import(
        "@/actions/returns.actions"
      );
      const res = await resolveReturnRefundAction(returnId, { refundMethod, note });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, { returnId }) => {
      qc.invalidateQueries({ queryKey: returnKeys.all });
      qc.invalidateQueries({ queryKey: returnKeys.detail(returnId) });
      qc.invalidateQueries({ queryKey: ["customer", "returns"] });
    },
  });
}

// ============================================================================
// Customer Self-Service Hooks
// ============================================================================

export function useCustomerReturns() {
  return useQuery({
    queryKey: ["customer", "returns"] as const,
    queryFn: async () => {
      const { fetchCustomerReturnsAction } = await import(
        "@/actions/returns.actions"
      );
      const res = await fetchCustomerReturnsAction();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useCustomerReturnDetail(returnId: string | undefined) {
  return useQuery({
    queryKey: ["customer", "returns", returnId] as const,
    queryFn: async () => {
      const { fetchCustomerReturnDetailAction } = await import(
        "@/actions/returns.actions"
      );
      const res = await fetchCustomerReturnDetailAction(returnId!);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!returnId,
    staleTime: 15_000,
  });
}

export function useReturnEligibility(orderId: string | undefined) {
  return useQuery({
    queryKey: ["customer", "orders", orderId, "return-eligibility"] as const,
    queryFn: async () => {
      const { checkReturnEligibilityAction } = await import(
        "@/actions/returns.actions"
      );
      const res = await checkReturnEligibilityAction(orderId!);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!orderId,
    staleTime: 10_000,
  });
}

export function useSubmitCustomerReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { submitCustomerReturnAction } = await import(
        "@/actions/returns.actions"
      );
      const res = await submitCustomerReturnAction(payload);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["customer", "returns"] });
      qc.invalidateQueries({
        queryKey: ["customer", "orders", variables.orderId, "return-eligibility"],
      });
      qc.invalidateQueries({ queryKey: returnKeys.all });
    },
  });
}

