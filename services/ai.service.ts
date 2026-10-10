import { AIGatewayService } from "./ai/ai-gateway.service";

export class AIService {
  private providerCode = "gemini"; // Default to gemini as requested

  async generateBlogContent(
    topic: string,
    keywords: string[]
  ): Promise<string> {
    const prompt = `Write a comprehensive, engaging, and SEO-optimized blog post about "${topic}". Incorporate the following keywords naturally: ${keywords.join(", ")}. Use markdown formatting with headings, bullet points, and paragraphs.`;
    const response = await AIGatewayService.generateText(this.providerCode, {
      prompt,
      systemInstruction:
        "You are an expert enterprise marketing copywriter and SEO specialist for Anchor Fashion.",
    });

    if (!response.success || !response.data) {
      throw new Error(`AI generation failed: ${response.error?.message}`);
    }
    return response.data.text;
  }

  async generateSEOMetadata(
    content: string
  ): Promise<{ title: string; description: string }> {
    const prompt = `Based on the following content, generate an SEO-optimized title (max 60 chars) and meta description (max 155 chars). Return the result as a JSON object with "title" and "description" keys.\n\nContent: ${content.substring(0, 2000)}`;
    const response = await AIGatewayService.generateText(this.providerCode, {
      prompt,
      systemInstruction:
        "You are an expert enterprise SEO specialist for Anchor Fashion. Output ONLY valid JSON.",
    });

    if (!response.success || !response.data) {
      throw new Error(`AI generation failed: ${response.error?.message}`);
    }

    try {
      // Remove any markdown code block formatting if present
      const jsonStr = response.data.text
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      throw new Error("Failed to parse AI response as JSON");
    }
  }

  async generateEmailCopy(
    campaignGoal: string,
    audience: string
  ): Promise<string> {
    const prompt = `Write a compelling email marketing campaign copy for the following goal: "${campaignGoal}". The target audience is: "${audience}". Include a catchy subject line at the top, followed by the email body. Ensure high conversion potential and engaging tone.`;
    const response = await AIGatewayService.generateText(this.providerCode, {
      prompt,
      systemInstruction:
        "You are an expert email marketing copywriter for Anchor Fashion.",
    });

    if (!response.success || !response.data) {
      throw new Error(`AI generation failed: ${response.error?.message}`);
    }
    return response.data.text;
  }
}

export const aiService = new AIService();
