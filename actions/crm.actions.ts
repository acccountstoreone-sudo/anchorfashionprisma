"use server";

import { revalidatePath } from "next/cache";
import { crmService } from "@/services/crm.service";
import { CRMLead, CRMNote } from "@/types/crm.types";
import { cleanupFakeMessages } from "@/actions/admin/messages.actions";

export async function getCustomersAction() {
  try {
    const customers = await crmService.getCustomers();
    return { data: customers };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getCustomerTimelineAction(profileId: string) {
  try {
    const timeline = await crmService.getCustomerTimeline(profileId);
    return { data: timeline };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getLeadsAction() {
  try {
    const leads = await crmService.getLeads();
    return { data: leads };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getLeadByIdAction(id: string) {
  try {
    const lead = await crmService.getLeadById(id);
    return { data: lead };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteLeadAction(id: string) {
  try {
    await crmService.deleteLead(id);
    revalidatePath("/admin/crm/leads");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createLeadAction(data: unknown) {
  try {
    const lead = await crmService.createLead(data);
    revalidatePath("/admin/crm/leads");
    return { data: lead };
  } catch (error: any) {
    if (error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      return { error: error.errors[0]?.message || "Validation failed" };
    }
    return { error: error.message || "Failed to create lead" };
  }
}

export async function updateLeadAction(id: string, data: unknown) {
  try {
    const lead = await crmService.updateLead(id, data);
    revalidatePath("/admin/crm/leads");
    return { data: lead };
  } catch (error: any) {
    if (error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      return { error: error.errors[0]?.message || "Validation failed" };
    }
    return { error: error.message || "Failed to update lead" };
  }
}

export async function convertLeadAction(id: string, profileId?: string) {
  try {
    const lead = await crmService.convertLead(id, profileId);
    try {
      revalidatePath("/admin/crm/leads");
      revalidatePath("/admin/customers");
    } catch (revalErr) {
      console.warn("Revalidation warning:", revalErr);
    }
    return { data: lead };
  } catch (error: any) {
    console.error("[convertLeadAction] Error:", error);
    return { error: error?.message || "Failed to convert lead" };
  }
}

export async function getLeadNotesAction(leadId: string) {
  try {
    const notes = await crmService.getLeadNotes(leadId);
    return { data: notes };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function addLeadNoteAction(leadId: string, content: string) {
  try {
    const note = await crmService.addNoteToLead(leadId, content);
    revalidatePath("/admin/crm/leads");
    return { data: note };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getLeadCommunicationLogsAction(leadId: string) {
  try {
    const logs = await crmService.getLeadCommunicationLogs(leadId);
    return { data: logs };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function addCustomerNoteAction(profileId: string, data: unknown) {
  try {
    const note = await crmService.addNoteToCustomer(profileId, data);
    try {
      revalidatePath(`/admin/customers/${profileId}`);
    } catch {}
    return { data: note };
  } catch (error: any) {
    return { error: error?.message || "Failed to add customer note" };
  }
}

export async function getCommunicationLogsAction() {
  try {
    await cleanupFakeMessages();
    const logs = await crmService.getCommunicationLogs();
    return { data: logs };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function logCommunicationAction(data: {
  type: "EMAIL" | "SMS" | "IN_APP" | "PUSH" | "CALL" | "MEETING";
  direction: "INBOUND" | "OUTBOUND";
  subject?: string;
  content: string;
  lead_id?: string;
  profile_id?: string;
  created_at?: string;
}) {
  try {
    const log = await crmService.logCommunication(data);
    revalidatePath("/admin/crm/messages");
    return { data: log };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateCommunicationLogAction(
  id: string,
  data: {
    type: "EMAIL" | "SMS" | "IN_APP" | "PUSH" | "CALL" | "MEETING";
    direction: "INBOUND" | "OUTBOUND";
    subject?: string;
    content: string;
    lead_id?: string;
    profile_id?: string;
    created_at?: string;
  }
) {
  try {
    const log = await crmService.updateCommunicationLog(id, data);
    revalidatePath("/admin/crm/messages");
    return { data: log };
  } catch (error: any) {
    return { error: error.message || "Failed to update communication log" };
  }
}

export async function deleteCommunicationLogAction(id: string) {
  try {
    await crmService.deleteCommunicationLog(id);
    revalidatePath("/admin/crm/messages");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete communication log" };
  }
}

