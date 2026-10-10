import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai/gemini";

const SYSTEM_PROMPT = `
You are an expert Content Generation AI for Anchor Fashion.
Your task is to generate high-quality marketing copy, SEO metadata, product descriptions, and social media captions.
Always adopt a premium, luxurious, and engaging brand voice.
Output the requested content directly, without conversational filler.
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contentType, contextData, tone = "premium" } = body;

    if (!contentType || !contextData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userPrompt = `
Task: Generate ${contentType}
Tone: ${tone}
Context: ${JSON.stringify(contextData)}

Please generate the content now.
`;

    const response = await generateContent(
      "gemini-1.5-flash",
      SYSTEM_PROMPT,
      userPrompt,
      0.8 // Higher temperature for more creative content
    );

    return NextResponse.json({
      content: response.text,
      usage: response.usage,
    });
  } catch (error: any) {
    console.error("Content Generator Error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
