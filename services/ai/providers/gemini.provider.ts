import {
  AIProvider,
  AIGenerateRequest,
  IntegrationResponse,
} from "@/types/integration.types";

export class GeminiProvider implements AIProvider {
  id = "gemini";
  name = "Google Gemini";

  private apiKey: string;
  private defaultModel: string;

  constructor(config: Record<string, any>) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || "";
    this.defaultModel = config.defaultModel || "gemini-1.5-pro";
  }

  async generateText(
    request: AIGenerateRequest
  ): Promise<
    IntegrationResponse<{
      text: string;
      usage?: { promptTokens: number; completionTokens: number };
    }>
  > {
    try {
      const model = request.model || this.defaultModel;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

      const payload: any = {
        contents: [
          {
            parts: [
              {
                text: request.prompt,
              },
            ],
          },
        ],
      };

      if (request.systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: request.systemInstruction }],
        };
      }

      if (
        request.temperature !== undefined ||
        request.maxTokens !== undefined
      ) {
        payload.generationConfig = {};
        if (request.temperature !== undefined)
          payload.generationConfig.temperature = request.temperature;
        if (request.maxTokens !== undefined)
          payload.generationConfig.maxOutputTokens = request.maxTokens;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.candidates && data.candidates.length > 0) {
        const text = data.candidates[0]?.content?.parts?.[0]?.text || "";
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            text,
            usage: data.usageMetadata
              ? {
                  promptTokens: data.usageMetadata.promptTokenCount || 0,
                  completionTokens:
                    data.usageMetadata.candidatesTokenCount || 0,
                }
              : undefined,
          },
        };
      }

      return {
        success: false,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        error: {
          code: data.error?.code?.toString() || "API_ERROR",
          message:
            data.error?.message || "Failed to generate text using Gemini",
        },
      };
    } catch (error: any) {
      return {
        success: false,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        error: {
          code: "EXCEPTION",
          message: error.message,
        },
      };
    }
  }
}
