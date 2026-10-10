import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini SDK
// Note: In production, ensure GEMINI_API_KEY is available in the environment
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateContent(
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7
) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }

  // Gemini models typically used: 'gemini-1.5-flash', 'gemini-1.5-pro'
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature,
    },
  });

  const startTime = Date.now();

  try {
    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    const latencyMs = Date.now() - startTime;

    // Fallback token counts if the response doesn't provide them reliably
    // 1 token ~= 4 chars rule of thumb
    const estimatedInputTokens = Math.ceil(
      (systemPrompt.length + userPrompt.length) / 4
    );
    const estimatedOutputTokens = Math.ceil(text.length / 4);

    return {
      text,
      usage: {
        inputTokens:
          response.usageMetadata?.promptTokenCount || estimatedInputTokens,
        outputTokens:
          response.usageMetadata?.candidatesTokenCount || estimatedOutputTokens,
        totalTokens:
          response.usageMetadata?.totalTokenCount ||
          estimatedInputTokens + estimatedOutputTokens,
      },
      latencyMs,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
