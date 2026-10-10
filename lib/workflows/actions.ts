import { NotificationService } from "@/lib/notifications/NotificationService";
import { generateContent } from "@/lib/ai/gemini";
import { PromptEngine } from "@/lib/ai/prompt-engine";

/**
 * Executes a notification action.
 */
export async function sendNotificationAction(
  userId: string,
  templateName: string,
  variables: Record<string, any>
) {
  return NotificationService.dispatch({
    userId,
    templateName,
    variables,
  });
}

/**
 * Executes an AI Generation action.
 */
export async function generateAiContentAction(
  promptName: string,
  variables: Record<string, string>
) {
  const promptTemplate = await PromptEngine.getPrompt(promptName);

  if (!promptTemplate) {
    throw new Error(`Prompt template ${promptName} not found.`);
  }

  const hydratedPrompt = PromptEngine.hydrateTemplate(
    promptTemplate.userPromptTemplate,
    variables
  );

  return generateContent(
    promptTemplate.model,
    promptTemplate.systemPrompt,
    hydratedPrompt,
    promptTemplate.temperature
  );
}

/**
 * Action to send an alert to an admin/manager.
 */
export async function alertAdminAction(
  title: string,
  message: string,
  role: "SUPERADMIN" | "MANAGER" = "MANAGER"
) {
  // Logic to query admins and send them a broadcast or push notification
  console.warn(`Alerting ${role}s: ${title} - ${message}`);
  return { success: true, alertedRole: role };
}
