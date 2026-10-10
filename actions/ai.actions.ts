"use server";

import { aiService } from "@/services/ai.service";

export async function generateBlogContent(
  topic: string,
  keywords: string[]
): Promise<string> {
  return await aiService.generateBlogContent(topic, keywords);
}

export async function generateSEOMetadata(
  content: string
): Promise<{ title: string; description: string }> {
  return await aiService.generateSEOMetadata(content);
}

export async function generateEmailCopy(
  campaignGoal: string,
  audience: string
): Promise<string> {
  return await aiService.generateEmailCopy(campaignGoal, audience);
}
