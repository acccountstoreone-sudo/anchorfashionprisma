import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai/gemini";

const SYSTEM_PROMPT = `
You are an expert AI Business Assistant for the Executive and Manager teams of Anchor Fashion.
Your goal is to provide insightful data analysis, operational suggestions, and summaries of business performance.
Always base your insights on the data provided in the prompt.
Highlight key performance indicators (KPIs) and suggest actionable steps.
Use markdown to format tables, bold important metrics, and create structured lists.
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contextData, query } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const userPrompt = `
Here is the current business context/data:
${JSON.stringify(contextData, null, 2)}

User Query:
${query}
`;

    const response = await generateContent(
      "gemini-1.5-pro", // Use pro for complex reasoning
      SYSTEM_PROMPT,
      userPrompt,
      0.4 // Lower temperature for more analytical responses
    );

    return NextResponse.json({
      role: "assistant",
      content: response.text,
      usage: response.usage,
    });
  } catch (error: any) {
    console.error("Business Assistant Error:", error);
    return NextResponse.json(
      { error: "Failed to process business request" },
      { status: 500 }
    );
  }
}
