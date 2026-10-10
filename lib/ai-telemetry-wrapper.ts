import { ObservabilityService } from "./observability";

interface AIOptions {
  modelName: string;
  traceId?: string;
}

/**
 * Wraps an AI function call (e.g., Gemini API call) to automatically
 * record observability telemetry such as latency, tokens, and success rates.
 */
export async function withAITelemetry<T>(
  aiCall: () => Promise<{
    result: T;
    promptTokens: number;
    completionTokens: number;
  }>,
  options: AIOptions
): Promise<T> {
  const startTime = Date.now();

  try {
    const response = await aiCall();
    const latency = Date.now() - startTime;

    // Asynchronously record success telemetry
    ObservabilityService.recordAITelemetry({
      model_name: options.modelName,
      prompt_tokens: response.promptTokens,
      completion_tokens: response.completionTokens,
      latency_ms: latency,
      status: "success",
      trace_id: options.traceId,
    });

    return response.result;
  } catch (error: any) {
    const latency = Date.now() - startTime;

    // Asynchronously record failure telemetry
    ObservabilityService.recordAITelemetry({
      model_name: options.modelName,
      prompt_tokens: 0, // In failure, tokens might be unknown
      completion_tokens: 0,
      latency_ms: latency,
      status: "error",
      error_message: error.message || "Unknown AI error",
      trace_id: options.traceId,
    });

    // If SEV-2 criteria met (e.g., core AI service failing repeatedly), an alert rule
    // in the DB will trigger. We can also directly log an error.
    ObservabilityService.log({
      service_id: "SYSTEM_AI_SERVICE", // Assuming a known ID or UUID
      level: "ERROR",
      message: `AI Model ${options.modelName} failed: ${error.message}`,
      trace_id: options.traceId,
    });

    throw error;
  }
}
