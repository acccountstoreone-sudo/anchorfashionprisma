export interface PromotionRecord {
  id: string;
  name: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  banner_url?: string;
  banner_link?: string;
  show_popup?: boolean;
  popup_delay?: number;
  description?: string;
  created_at: string;
}

export interface CreatePromotionInput {
  name: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  banner_url?: string;
  banner_link?: string;
  show_popup?: boolean;
  popup_delay?: number;
  description?: string;
}

export class PromotionRepository {
  static async getPromotions(): Promise<PromotionRecord[]> {
    return [];
  }

  static async getPromotionById(id: string): Promise<PromotionRecord | null> {
    return null;
  }

  static async createPromotion(
    input: CreatePromotionInput
  ): Promise<PromotionRecord> {
    return {
      id: "dummy-id",
      name: input.name,
      discount_percentage: input.discount_percentage,
      start_date: input.start_date,
      end_date: input.end_date,
      is_active: input.is_active ?? true,
      banner_url: input.banner_url || "",
      banner_link: input.banner_link || "",
      show_popup: input.show_popup ?? true,
      popup_delay: input.popup_delay ?? 5,
      description: input.description || "",
      created_at: new Date().toISOString(),
    };
  }

  static async updatePromotion(
    id: string,
    updates: Partial<PromotionRecord>
  ): Promise<PromotionRecord> {
    return {
      id,
      name: updates.name || "Updated Promo",
      discount_percentage: updates.discount_percentage || 0,
      start_date: updates.start_date || new Date().toISOString(),
      end_date: updates.end_date || new Date().toISOString(),
      is_active: updates.is_active ?? true,
      banner_url: updates.banner_url || "",
      banner_link: updates.banner_link || "",
      show_popup: updates.show_popup ?? true,
      popup_delay: updates.popup_delay ?? 5,
      description: updates.description || "",
      created_at: new Date().toISOString(),
    };
  }

  static async togglePromotionStatus(
    id: string,
    is_active: boolean
  ): Promise<PromotionRecord> {
    return this.updatePromotion(id, { is_active });
  }

  static async deletePromotion(id: string): Promise<void> {
    // DO nothing
  }

  static async getBestActivePromotion(): Promise<PromotionRecord | null> {
    // Mock for now
    return null;
  }
}
