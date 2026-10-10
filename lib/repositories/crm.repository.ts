import { prisma } from "@/lib/prisma";
import {
  CRMCustomer,
  CRMLead,
  CRMNote,
  CommunicationLog,
} from "@/types/crm.types";

export class CRMRepository {
  async getCustomers(): Promise<CRMCustomer[]> {
    const customers = await prisma.customer.findMany({
      include: { profile: true },
    });
    return customers.map(mapCustomerToCRM) as unknown as CRMCustomer[];
  }

  async getCustomerById(id: string): Promise<CRMCustomer> {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!customer) throw new Error("Customer not found");
    return mapCustomerToCRM(customer) as unknown as CRMCustomer;
  }

  async updateCustomer(
    id: string,
    updates: Partial<CRMCustomer>
  ): Promise<CRMCustomer> {
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        notes: (updates as any).notes,
        status: (updates as any).status,
      },
      include: { profile: true },
    });
    return mapCustomerToCRM(customer) as unknown as CRMCustomer;
  }

  async getLeads(): Promise<CRMLead[]> {
    const leads = await prisma.lead.findMany();
    return leads.map(l => ({
      ...l,
      first_name: l.firstName,
      last_name: l.lastName,
      assigned_to: l.assignedTo,
      created_at: l.createdAt.toISOString(),
      updated_at: l.updatedAt.toISOString(),
    })) as unknown as CRMLead[];
  }

  async getNotes(profileId: string): Promise<CRMNote[]> {
    // mapped to CommunicationLog in Prisma
    const logs = await prisma.communicationLog.findMany({
      where: { profileId, type: "NOTE" },
      orderBy: { createdAt: "desc" },
    });
    return logs.map(l => ({
      id: l.id,
      profile_id: l.profileId,
      content: l.content,
      created_at: l.createdAt.toISOString(),
    })) as unknown as CRMNote[];
  }

  async createNote(note: Partial<CRMNote>): Promise<CRMNote> {
    const log = await prisma.communicationLog.create({
      data: {
        profileId: note.profile_id!,
        content: note.content || "",
        type: "NOTE",
        direction: "OUTBOUND",
      }
    });
    return {
      id: log.id,
      profile_id: log.profileId!,
      content: log.content,
      created_at: log.createdAt.toISOString(),
    } as unknown as CRMNote;
  }

  async getCommunicationLogs(profileId: string): Promise<CommunicationLog[]> {
    const logs = await prisma.communicationLog.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
    });
    return logs.map(l => ({
      ...l,
      profile_id: l.profileId,
      lead_id: l.leadId,
      sender_id: l.senderId,
      created_at: l.createdAt.toISOString(),
    })) as unknown as CommunicationLog[];
  }
}

function mapCustomerToCRM(customer: any) {
  return {
    ...customer,
    profile_id: customer.profileId,
    first_name: customer.profile?.firstName || customer.name.split(" ")[0] || "Customer",
    last_name: customer.profile?.lastName || customer.name.split(" ")[1] || "",
    total_spent: customer.totalSpent,
    orders_count: customer.ordersCount,
    created_at: customer.createdAt.toISOString(),
    updated_at: customer.updatedAt.toISOString(),
  };
}
