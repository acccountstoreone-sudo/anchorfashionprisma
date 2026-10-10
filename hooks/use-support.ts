"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTicketsAction,
  getTicketDetailsAction,
  createTicketAction,
  updateTicketAction,
  assignTicketAction,
  getAvailableAgentsAction,
} from "@/app/actions/support/ticket.actions";
import {
  addTicketMessageAction,
  getKnowledgeBaseAction,
} from "@/actions/support.actions";

export function useTickets() {
  return useQuery({
    queryKey: ["support_tickets"],
    queryFn: async () => {
      const { data, error } = await getTicketsAction();
      if (error) throw new Error(error);
      return data;
    },
  });
}

export function useTicketDetails(id: string) {
  return useQuery({
    queryKey: ["support_ticket", id],
    queryFn: async () => {
      const { data, error } = await getTicketDetailsAction(id);
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketData: any) => {
      const { data, error } = await createTicketAction(ticketData);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
      toast.success("Ticket created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create ticket: ${error.message}`);
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: res, error } = await updateTicketAction(id, data);
      if (error) throw new Error(error);
      return res;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["support_ticket", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
      toast.success("Ticket updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update ticket: ${error.message}`);
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId,
      agentId,
    }: {
      ticketId: string;
      agentId: string;
    }) => {
      const { data, error } = await assignTicketAction(ticketId, agentId);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["support_ticket", variables.ticketId],
      });
      queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
      toast.success("Ticket assigned successfully");
    },
    onError: (error) => {
      toast.error(`Failed to assign ticket: ${error.message}`);
    },
  });
}

export function useAddTicketMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, data }: { ticketId: string; data: any }) => {
      const { data: res, error } = await addTicketMessageAction(ticketId, data);
      if (error) throw new Error(error);
      return res;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["support_ticket", variables.ticketId],
      });
      toast.success("Message sent");
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });
}

export function useKnowledgeBase() {
  return useQuery({
    queryKey: ["support_knowledge_base"],
    queryFn: async () => {
      const { data, error } = await getKnowledgeBaseAction();
      if (error) throw new Error(error);
      return data;
    },
  });
}

export function useAvailableAgents() {
  return useQuery({
    queryKey: ["support_agents"],
    queryFn: async () => {
      const { data, error } = await getAvailableAgentsAction();
      if (error) throw new Error(error);
      return data;
    },
  });
}
