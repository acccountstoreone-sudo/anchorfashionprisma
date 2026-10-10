import { CRMRepository } from "@/lib/repositories/crm.repository";
import {
  CRMCustomer,
  CRMLead,
  CRMNote,
  CommunicationLog,
} from "@/types/crm.types";

export class CRMService {
  private repository: CRMRepository;

  constructor() {
    this.repository = new CRMRepository();
  }

  async getCustomers(): Promise<CRMCustomer[]> {
    return this.repository.getCustomers();
  }

  async getCustomerById(id: string): Promise<CRMCustomer> {
    return this.repository.getCustomerById(id);
  }

  async updateCustomer(
    id: string,
    updates: Partial<CRMCustomer>
  ): Promise<CRMCustomer> {
    return this.repository.updateCustomer(id, updates);
  }

  async getLeads(): Promise<CRMLead[]> {
    return this.repository.getLeads();
  }

  async getNotes(profileId: string): Promise<CRMNote[]> {
    return this.repository.getNotes(profileId);
  }

  async createNote(profileId: string, content: string): Promise<CRMNote> {
    return this.repository.createNote({
      profile_id: profileId,
      content,
      is_pinned: false,
    });
  }

  async getTimeline(profileId: string): Promise<any[]> {
    // In a real implementation, you would aggregate notes, orders, and comm logs.
    const notes = await this.getNotes(profileId);
    const comms = await this.repository.getCommunicationLogs(profileId);

    const timeline = [
      ...notes.map((n) => ({ type: "note", date: n.created_at, data: n })),
      ...comms.map((c) => ({ type: "comm", date: c.created_at, data: c })),
    ];

    return timeline.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
}
