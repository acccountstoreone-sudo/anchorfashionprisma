import { supabase } from "../supabase";
import { PersonalizationContext } from "./types";

export class AIPersonalizationEngine {
  /**
   * Fetches the user's computed personalization context.
   * If it doesn't exist, returns a default empty context.
   */
  static async getContext(userId: string): Promise<PersonalizationContext> {
    const { data, error } = await supabase
      .from("ai_user_context_vectors")
      .select(
        "explicit_preferences, implicit_preferences, risk_score, lifetime_value_predicted"
      )
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return {
        userId,
        explicitPreferences: {},
        implicitPreferences: {},
        riskScore: 0,
        lifetimeValuePredicted: 0,
      };
    }

    return {
      userId,
      explicitPreferences: data.explicit_preferences,
      implicitPreferences: data.implicit_preferences,
      riskScore: data.risk_score,
      lifetimeValuePredicted: data.lifetime_value_predicted,
    };
  }

  /**
   * Updates a user's implicit preferences (e.g., when they view a category multiple times)
   */
  static async updateImplicitPreferences(
    userId: string,
    newPreferences: Record<string, any>
  ): Promise<void> {
    // We would typically fetch existing, merge, and update.
    // For performance, this can also be handled by an Edge Function or Database Function directly.
    const context = await this.getContext(userId);
    const merged = { ...context.implicitPreferences, ...newPreferences };

    await supabase.from("ai_user_context_vectors").upsert({
      user_id: userId,
      implicit_preferences: merged,
      last_computed_at: new Date().toISOString(),
    });
  }
}
