import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { AIPredictionSchema } from "@/schemas/operations.schemas";

// Make sure to set GEMINI_API_KEY in your .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateSalesForecast(
  historicalData: any[]
): Promise<{ forecast?: any; error?: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = `Based on the following historical sales data, provide a 30-day forecast and highlight any seasonal trends or anomalies.\n\nData:\n${JSON.stringify(historicalData)}\n\nFormat the response as a JSON object with 'forecastedRevenue', 'trendAnalysis', and 'confidence' fields.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsedData = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { rawResponse: text };

    return { forecast: parsedData };
  } catch (error: any) {
    console.error("Error generating sales forecast:", error);
    return { error: error.message || "Failed to generate forecast" };
  }
}

export async function generateInventoryInsights(
  inventoryData: any[]
): Promise<{ insights?: any; error?: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = `Analyze this inventory data and identify products at risk of stockout, overstock items, and recommend reorder quantities.\n\nData:\n${JSON.stringify(inventoryData)}\n\nFormat as JSON with 'stockoutRisks', 'overstockItems', and 'recommendations'.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsedData = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { rawResponse: text };

    return { insights: parsedData };
  } catch (error: any) {
    console.error("Error generating inventory insights:", error);
    return { error: error.message || "Failed to generate insights" };
  }
}

export async function saveAIPrediction(
  data: unknown
): Promise<{ success?: boolean; error?: string }> {
  try {
    const parsedData = AIPredictionSchema.parse(data);
    const supabase = await createClient();

    const { error } = await supabase.from("ai_predictions").insert({
      model_name: parsedData.model_name,
      target_entity_type: parsedData.target_entity_type,
      target_entity_id: parsedData.target_entity_id || null,
      prediction_type: parsedData.prediction_type,
      prediction_data: parsedData.prediction_data,
      confidence_score: parsedData.confidence_score || null,
      metadata: parsedData.metadata,
      valid_until: parsedData.valid_until || null,
    });

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (error: any) {
    console.error("Error saving AI prediction:", error);
    return { error: error.message || "Failed to save prediction" };
  }
}
