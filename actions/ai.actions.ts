"use server";

import { aiService } from "@/services/ai.service";
import { verifyStaff } from "@/lib/security/roles";

export async function generateBlogContent(
  topic: string,
  keywords: string[]
): Promise<string> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  return await aiService.generateBlogContent(topic, keywords);
}

export async function generateSEOMetadata(
  content: string
): Promise<{ title: string; description: string }> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  return await aiService.generateSEOMetadata(content);
}

export async function generateEmailCopy(
  campaignGoal: string,
  audience: string
): Promise<string> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  return await aiService.generateEmailCopy(campaignGoal, audience);
}
