"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getCustomersAction,
  getCustomerTimelineAction,
  getLeadsAction,
  createLeadAction,
  updateLeadAction,
  convertLeadAction,
  addCustomerNoteAction,
} from "@/actions/crm.actions";

export function useCustomers() {
  return useQuery({
    queryKey: ["crm_customers"],
    queryFn: async () => {
      const { data, error } = await getCustomersAction();
      if (error) throw new Error(error);
      return data;
    },
  });
}

export function useCustomerTimeline(profileId: string) {
  return useQuery({
    queryKey: ["crm_customer_timeline", profileId],
    queryFn: async () => {
      const { data, error } = await getCustomerTimelineAction(profileId);
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!profileId,
  });
}

export function useLeads() {
  return useQuery({
    queryKey: ["crm_leads"],
    queryFn: async () => {
      const { data, error } = await getLeadsAction();
      if (error) throw new Error(error);
      return data;
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leadData: any) => {
      const { data, error } = await createLeadAction(leadData);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
      toast.success("Lead created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create lead: ${error.message}`);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: res, error } = await updateLeadAction(id, data);
      if (error) throw new Error(error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
      toast.success("Lead updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update lead: ${error.message}`);
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      profileId,
    }: {
      id: string;
      profileId: string;
    }) => {
      const { data, error } = await convertLeadAction(id, profileId);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm_customers"] });
      toast.success("Lead converted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to convert lead: ${error.message}`);
    },
  });
}

export function useAddCustomerNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      profileId,
      data,
    }: {
      profileId: string;
      data: any;
    }) => {
      const { data: res, error } = await addCustomerNoteAction(profileId, data);
      if (error) throw new Error(error);
      return res;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["crm_customer_timeline", variables.profileId],
      });
      toast.success("Note added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add note: ${error.message}`);
    },
  });
}
