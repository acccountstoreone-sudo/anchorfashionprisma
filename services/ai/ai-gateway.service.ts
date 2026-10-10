import {
  AIProvider,
  AIGenerateRequest,
  IntegrationResponse,
} from "@/types/integration.types";
import { ConfigService } from "@/services/config/config.service";
import { GeminiProvider } from "./providers/gemini.provider";

export class AIGatewayService {
  /**
   * Factory to get an instantiated AI provider based on the provider code
   */
  private static async getProvider(providerCode: string): Promise<AIProvider> {
    const config = await ConfigService.getProviderConfig("ai", providerCode);

    if (!config) {
      throw new Error(
        `AI provider ${providerCode} is not configured or inactive.`
      );
    }

    switch (providerCode.toLowerCase()) {
      case "gemini":
        return new GeminiProvider(config.config);
      default:
        throw new Error(`AI provider ${providerCode} is not supported.`);
    }
  }

  /**
   * Generates text using the specified AI provider
   */
  static async generateText(
    providerCode: string,
    request: AIGenerateRequest
  ): Promise<
    IntegrationResponse<{
      text: string;
      usage?: { promptTokens: number; completionTokens: number };
    }>
  > {
    try {
      const provider = await this.getProvider(providerCode);
      return await provider.generateText(request);
    } catch (error: any) {
      return {
        success: false,
        providerId: providerCode,
        timestamp: new Date().toISOString(),
        error: {
          code: "GATEWAY_ERROR",
          message: error.message,
        },
      };
    }
  }
}
