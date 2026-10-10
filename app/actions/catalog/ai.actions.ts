"use server";

import { CatalogAIService } from "@/lib/services/ai/catalog-ai.service";

export async function generateProductDescriptionAction(
  name: string,
  attributes: Record<string, string>,
  shortDesc?: string
) {
  try {
    const text = await CatalogAIService.generateProductDescription(
      name,
      attributes,
      shortDesc
    );
    return { success: true, data: text };
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return { success: false, error: "Failed to generate product description" };
  }
}

export async function generateSeoMetadataAction(
  name: string,
  description: string
) {
  try {
    const seoData = await CatalogAIService.generateSeoMetadata(
      name,
      description
    );
    return { success: true, data: seoData };
  } catch (error: any) {
    console.error("AI SEO Generation Error:", error);
    return { success: false, error: "Failed to generate SEO metadata" };
  }
}
