import { AIGatewayRequest, AIGatewayResponse } from "./types";
import { PromptEngine } from "./prompt-engine";
import { generateContent } from "./gemini";
import { AITelemetry } from "./telemetry";

export class AIGateway {
  /**
   * Main entry point for all AI requests.
   * Handles prompt fetching, hydration, execution, and telemetry.
   */
  static async execute(request: AIGatewayRequest): Promise<AIGatewayResponse> {
    try {
      // 1. Fetch the prompt configuration
      const promptConfig = await PromptEngine.getPrompt(request.promptName);

      // 2. Hydrate the user prompt with variables
      const finalUserPrompt = PromptEngine.hydrateTemplate(
        promptConfig.userPromptTemplate,
        request.variables
      );

      // 3. Execute the LLM call
      const result = await generateContent(
        promptConfig.model,
        promptConfig.systemPrompt,
        finalUserPrompt,
        promptConfig.temperature
      );

      // 4. Calculate cost
      const cost = AITelemetry.estimateCost(
        promptConfig.model,
        result.usage.inputTokens,
        result.usage.outputTokens
      );

      // 5. Log telemetry asynchronously
      AITelemetry.logRequest({
        promptId: promptConfig.id,
        promptName: promptConfig.name,
        model: promptConfig.model,
        userId: request.userId,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        latencyMs: result.latencyMs,
        costEstimatedUsd: cost,
        status: "success",
      });

      return {
        text: result.text,
      };
    } catch (error: any) {
      // Log error telemetry
      AITelemetry.logRequest({
        promptName: request.promptName,
        model: "unknown",
        userId: request.userId,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        latencyMs: 0,
        costEstimatedUsd: 0,
        status: "error",
        errorMessage: error?.message || "Unknown error",
      });

      throw error;
    }
  }
}
