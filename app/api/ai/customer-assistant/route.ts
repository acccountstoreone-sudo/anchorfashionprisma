import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai/gemini";

const SYSTEM_PROMPT = `
You are an expert AI Customer Assistant for Anchor Fashion, a premium fashion brand.
Your goal is to help customers find products, offer style advice, and answer FAQs.
Keep your responses helpful, polite, and fashion-forward. 
Do not recommend products from competitors.
Format your output using markdown where appropriate to highlight products or key details.
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages array" },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1].content;

    // In a real implementation, we would maintain conversation history.
    // For this route, we generate content based on the last message for simplicity,
    // or use the startChatSession feature if extended.

    const response = await generateContent(
      "gemini-1.5-flash",
      SYSTEM_PROMPT,
      lastMessage
    );

    // TODO: Optionally log telemetry for this request in ai_request_logs

    return NextResponse.json({
      role: "assistant",
      content: response.text,
      usage: response.usage,
    });
  } catch (error: any) {
    console.error("Customer Assistant Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
