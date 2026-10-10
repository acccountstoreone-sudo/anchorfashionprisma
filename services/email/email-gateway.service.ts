import {
  EmailProvider,
  EmailSendRequest,
  IntegrationResponse,
} from "@/types/integration.types";
import { ConfigService } from "@/services/config/config.service";
import { ResendProvider } from "./providers/resend.provider";

export class EmailGatewayService {
  /**
   * Factory to get an instantiated email provider based on the provider code
   */
  private static async getProvider(
    providerCode: string
  ): Promise<EmailProvider> {
    const config = await ConfigService.getProviderConfig(
      "marketing",
      providerCode
    ); // Assuming email falls under marketing/communication

    if (!config) {
      throw new Error(
        `Email provider ${providerCode} is not configured or inactive.`
      );
    }

    switch (providerCode.toLowerCase()) {
      case "resend":
        return new ResendProvider(config.config);
      default:
        throw new Error(`Email provider ${providerCode} is not supported.`);
    }
  }

  /**
   * Sends an email through the specified provider
   */
  static async sendEmail(
    providerCode: string,
    request: EmailSendRequest
  ): Promise<IntegrationResponse<{ messageId: string }>> {
    try {
      const provider = await this.getProvider(providerCode);
      return await provider.sendEmail(request);
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
