import {
  EmailProvider,
  EmailSendRequest,
  IntegrationResponse,
} from "@/types/integration.types";

export class ResendProvider implements EmailProvider {
  id = "resend";
  name = "Resend";

  private apiKey: string;
  private defaultFrom: string;

  constructor(config: Record<string, any>) {
    this.apiKey = config.apiKey || process.env.RESEND_API_KEY || "";
    this.defaultFrom =
      config.defaultFrom ||
      process.env.RESEND_DEFAULT_FROM ||
      "noreply@anchorfashion.com";
  }

  async sendEmail(
    request: EmailSendRequest
  ): Promise<IntegrationResponse<{ messageId: string }>> {
    try {
      const payload: any = {
        from: request.from || this.defaultFrom,
        to: Array.isArray(request.to) ? request.to : [request.to],
        subject: request.subject,
      };

      if (request.html) payload.html = request.html;
      if (request.text) payload.text = request.text;
      if (request.cc)
        payload.cc = Array.isArray(request.cc) ? request.cc : [request.cc];
      if (request.bcc)
        payload.bcc = Array.isArray(request.bcc) ? request.bcc : [request.bcc];
      if (request.replyTo) payload.reply_to = request.replyTo;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.id) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            messageId: data.id,
          },
        };
      }

      return {
        success: false,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        error: {
          code: data.error?.name || "API_ERROR",
          message: data.error?.message || "Failed to send email via Resend",
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
