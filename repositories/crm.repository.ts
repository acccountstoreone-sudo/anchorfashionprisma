import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  CRMCustomer,
  CRMLead,
  CRMNote,
  CommunicationLog,
} from "@/types/crm.types";

export class CRMRepository {
  private getAdminClient() {
    return createAdminClient();
  }

  async getCustomers(): Promise<CRMCustomer[]> {
    const supabase = this.getAdminClient();
    try {
      const { data: customerProfiles } = await supabase
        .from("customer_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (customerProfiles && customerProfiles.length > 0) {
        return customerProfiles.map((cp: any) => ({
          ...cp,
          profile_id: cp.id,
          first_name: cp.first_name,
          last_name: cp.last_name,
          email: cp.email,
          phone: cp.phone,
        })) as any;
      }
    } catch {}

    const { data, error } = await supabase
      .from("crm_customers")
      .select("*, customer_profiles(*)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((c: any) => ({
      ...c,
      first_name: c.customer_profiles?.first_name || c.first_name,
      last_name: c.customer_profiles?.last_name || c.last_name,
      email: c.customer_profiles?.email || c.email,
      phone: c.customer_profiles?.phone || c.phone,
    })) as any;
  }

  async getCustomerById(id: string): Promise<CRMCustomer | null> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("crm_customers")
      .select("*, customer_profiles(*)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // not found
      throw new Error(error.message);
    }
    return data;
  }

  async getLeads(): Promise<CRMLead[]> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async createLead(leadData: Partial<CRMLead>): Promise<CRMLead> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("crm_leads")
      .insert(leadData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateLead(id: string, updateData: Partial<CRMLead>): Promise<CRMLead> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("crm_leads")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getLeadById(id: string): Promise<CRMLead | null> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // not found
      throw new Error(error.message);
    }
    return data;
  }

  async getLeadByEmail(email: string): Promise<CRMLead | null> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .ilike("email", email.trim())
      .maybeSingle();

    if (error) return null;
    return data;
  }

  async deleteLead(id: string): Promise<void> {
    const supabase = this.getAdminClient();
    try {
      await supabase.from("communication_logs").delete().eq("lead_id", id);
    } catch {}
    try {
      await supabase.from("crm_notes").delete().eq("lead_id", id);
    } catch {}
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async getNotes(profileId?: string, leadId?: string): Promise<CRMNote[]> {
    const supabase = this.getAdminClient();
    let query = supabase
      .from("crm_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileId) {
      query = query.eq("profile_id", profileId);
    } else if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  async createNote(noteData: Partial<CRMNote>): Promise<CRMNote> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("crm_notes")
      .insert(noteData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getCommunicationLogs(
    profileId?: string,
    leadId?: string
  ): Promise<CommunicationLog[]> {
    const supabase = this.getAdminClient();
    let query = supabase
      .from("communication_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileId) {
      query = query.eq("profile_id", profileId);
    } else if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  async createCommunicationLog(
    logData: Partial<CommunicationLog>
  ): Promise<CommunicationLog> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("communication_logs")
      .insert(logData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateCommunicationLog(
    id: string,
    logData: Partial<CommunicationLog>
  ): Promise<CommunicationLog> {
    const supabase = this.getAdminClient();
    const { data, error } = await supabase
      .from("communication_logs")
      .update(logData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteCommunicationLog(id: string): Promise<void> {
    const supabase = this.getAdminClient();
    const { error } = await supabase
      .from("communication_logs")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  }
}

export const crmRepository = new CRMRepository();
