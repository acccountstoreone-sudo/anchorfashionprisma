import { supabase } from "../supabase";
import { AILogEntry } from "./types";

export class AITelemetry {
  /**
   * Logs an AI interaction asynchronously (doesn't block the main thread)
   */
  static logRequest(entry: AILogEntry) {
    // Fire and forget
    supabase
      .from("ai_request_logs")
      .insert([
        {
          prompt_id: entry.promptId,
          prompt_name: entry.promptName,
          model: entry.model,
          user_id: entry.userId,
          input_tokens: entry.inputTokens,
          output_tokens: entry.outputTokens,
          total_tokens: entry.totalTokens,
          latency_ms: entry.latencyMs,
          cost_estimated_usd: entry.costEstimatedUsd,
          status: entry.status,
          error_message: entry.errorMessage,
        },
      ])
      .then(({ error }) => {
        if (error) {
          console.error("Failed to log AI telemetry:", error);
        }
      });
  }

  /**
   * Extremely rough cost estimation based on standard Gemini 1.5 pricing
   * Update this with real dynamic pricing based on model
   */
  static estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    if (model.includes("flash")) {
      // ~$0.35 per 1M input, ~$1.05 per 1M output
      return (
        (inputTokens / 1_000_000) * 0.35 + (outputTokens / 1_000_000) * 1.05
      );
    } else if (model.includes("pro")) {
      // ~$3.50 per 1M input, ~$10.50 per 1M output
      return (
        (inputTokens / 1_000_000) * 3.5 + (outputTokens / 1_000_000) * 10.5
      );
    }
    return 0;
  }
}
