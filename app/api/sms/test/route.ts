import { NextRequest, NextResponse } from "next/server";
import { AlphaSmsService } from "@/lib/services/sms/alpha-sms.service";

/**
 * POST /api/sms/test
 * Test sending an SMS via Alpha SMS REST API
 * Body: { phone: string, message?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = body.phone || body.to;
    const message =
      body.message ||
      body.msg ||
      "Test SMS from Anchor Fashion via Alpha SMS REST API.";

    if (!phone) {
      return NextResponse.json(
        {
          error: "Phone number is required in request body (e.g. { phone: '01712345678', message: 'Test message' })",
        },
        { status: 400 }
      );
    }

    const result = await AlphaSmsService.sendSMS({
      to: phone,
      message,
      type: "TEST",
    });

    return NextResponse.json(
      {
        success: result.success,
        status: result.status,
        recipient: result.phone,
        message: result.message,
        requestId: result.requestId || null,
        isTestMode: !!result.isTestMode,
        error: result.error || null,
      },
      { status: result.success ? 200 : 400 }
    );
  } catch (error: any) {
    console.error("POST /api/sms/test exception:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
