import { EmailProvider } from "./EmailProvider";
import { PushProvider } from "./PushProvider";
import { TemplateEngine } from "./TemplateEngine";
import prisma from "@/lib/prisma";

export interface NotificationEvent {
  userId: string;
  templateName: string;
  variables: Record<string, any>;
  emailTo?: string; // Optional override
}

export class NotificationService {
  /**
   * Processes a notification event and dispatches it to the appropriate channels.
   */
  static async dispatch(event: NotificationEvent) {
    const { userId, templateName, variables, emailTo } = event;

    try {
      // 1. Mocking Template Fetch (since it's not in Prisma schema)
      const template = {
        id: "mock_template_id",
        name: templateName,
        type: "SYSTEM",
        channels: ["email", "in_app"],
        subject_template: `Notification: ${templateName}`,
        body_template: `Hello, this is a notification for ${templateName}.`,
      };

      const isEmailEnabled = true;
      const isPushEnabled = true;

      const channels: string[] = template.channels || [];
      const subject = TemplateEngine.hydrate(
        template.subject_template || "",
        variables
      );
      const body = TemplateEngine.hydrate(template.body_template, variables);

      // 3. Dispatch to Channels

      if (channels.includes("email") && isEmailEnabled && emailTo) {
        const emailRes = await EmailProvider.send({
          to: emailTo,
          subject: subject,
          html: body,
        });

        await this.logDelivery(
          userId,
          template.id,
          "email",
          emailRes.id,
          emailRes.error ? "FAILED" : "SENT",
          emailRes.error?.message
        );
      }

      if (channels.includes("in_app")) {
        try {
          await prisma.notification.create({
            data: {
              userId,
              title: subject,
              message: body.replace(/<[^>]*>?/gm, ""), // Strip HTML for simple display
              type: template.type,
            },
          });
          
          await this.logDelivery(
            userId,
            template.id,
            "in_app",
            undefined,
            "DELIVERED"
          );
        } catch (inAppErr: any) {
          await this.logDelivery(
            userId,
            template.id,
            "in_app",
            undefined,
            "FAILED",
            inAppErr?.message
          );
        }
      }
    } catch (error) {
      console.error("Error in NotificationService.dispatch:", error);
    }
  }

  private static async logDelivery(
    userId: string,
    templateId: string,
    channel: string,
    providerId?: string,
    status: string = "PENDING",
    errorMessage?: string
  ) {
    console.log(`[Notification Log] User: ${userId}, Template: ${templateId}, Channel: ${channel}, Status: ${status}, Error: ${errorMessage}`);
  }
}
