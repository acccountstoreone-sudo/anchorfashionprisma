import { generateText } from "ai";
// Assuming we are using the Vercel AI SDK with the google provider
import { google } from "@ai-sdk/google";

export class CatalogAIService {
  /**
   * Generates a comprehensive product description based on basic input.
   */
  static async generateProductDescription(
    name: string,
    attributes: Record<string, string>,
    shortDesc?: string
  ) {
    const prompt = `
      You are an expert e-commerce copywriter for Anchor Fashion, a premium apparel brand.
      Please write a compelling, SEO-optimized, and engaging product description for the following item:
      
      Product Name: ${name}
      ${shortDesc ? `Short Description: ${shortDesc}` : ""}
      Attributes: ${JSON.stringify(attributes)}
      
      The description should highlight the premium quality, style, and unique selling points. 
      Format the output in HTML (paragraphs, bullet points for features). Do not include the <html> or <body> tags.
    `;

    const { text } = await generateText({
      model: google("gemini-2.5-pro"),
      prompt,
    });

    return text;
  }

  /**
   * Generates SEO metadata (Title, Description, Keywords).
   */
  static async generateSeoMetadata(name: string, description: string) {
    const prompt = `
      You are an expert SEO specialist for an e-commerce fashion brand.
      Given the following product details, generate an optimized SEO Meta Title (max 60 chars), 
      Meta Description (max 160 chars), and a comma-separated list of 5-7 highly relevant keywords.
      
      Product Name: ${name}
      Description: ${description}
      
      Return ONLY a JSON object with this exact structure:
      {
        "metaTitle": "...",
        "metaDescription": "...",
        "keywords": ["...", "..."]
      }
    `;

    const { text } = await generateText({
      model: google("gemini-2.5-pro"),
      prompt,
    });

    try {
      // Remove any markdown code block formatting
      const jsonStr = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI SEO JSON:", e);
      throw new Error("Invalid response from AI");
    }
  }
}
