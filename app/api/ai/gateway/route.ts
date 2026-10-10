import { NextRequest, NextResponse } from "next/server";
import { AIGateway } from "@/lib/ai/gateway";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request
    if (!body.promptName) {
      return NextResponse.json(
        { error: "Missing required field: promptName" },
        { status: 400 }
      );
    }

    // Pass to AI Gateway
    const response = await AIGateway.execute({
      promptName: body.promptName,
      variables: body.variables || {},
      userId: body.userId || "anonymous",
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("AI Gateway Route Error:", error);

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
