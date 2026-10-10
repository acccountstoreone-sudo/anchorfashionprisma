import { supabase } from "../supabase";
import { AIGovernanceAction } from "./types";

export class AIGovernance {
  /**
   * Logs a governance action. If the confidence score is below the auto-approve threshold,
   * or if the action type is deemed highly sensitive, it requires manual review.
   */
  static async requestActionApproval(
    actionType: string,
    suggestedByModel: string,
    payload: Record<string, any>,
    confidenceScore: number,
    requiresManualReviewThreshold: number = 0.9
  ): Promise<AIGovernanceAction> {
    // Auto-approve if confidence is high enough AND it's not a restricted action
    const restrictedActions = [
      "mass_discount",
      "bulk_content",
      "sensitive_communication",
    ];
    let status: "PENDING_REVIEW" | "APPROVED" = "PENDING_REVIEW";

    if (
      confidenceScore >= requiresManualReviewThreshold &&
      !restrictedActions.includes(actionType)
    ) {
      status = "APPROVED";
    }

    const { data, error } = await supabase
      .from("ai_governance_actions")
      .insert({
        action_type: actionType,
        suggested_by_model: suggestedByModel,
        payload,
        confidence_score: confidenceScore,
        status: status,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to log governance action: ${error?.message}`);
    }

    return {
      id: data.id,
      actionType: data.action_type,
      suggestedByModel: data.suggested_by_model,
      payload: data.payload,
      confidenceScore: data.confidence_score,
      status: data.status,
    };
  }

  /**
   * Admin function to manually approve a pending AI action.
   */
  static async approveAction(
    actionId: string,
    adminId: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from("ai_governance_actions")
      .update({
        status: "APPROVED",
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", actionId);

    return !error;
  }
}
