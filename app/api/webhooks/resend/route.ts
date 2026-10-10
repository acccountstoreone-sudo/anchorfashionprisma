import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Ideally, verify Resend Webhook Signature here
    // using svix or the resend provided mechanism

    const eventType = payload.type; // e.g. email.sent, email.delivered, email.bounced, email.clicked
    const data = payload.data; // contains message_id

    if (!data || !data.email_id) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    let status = "PENDING";
    if (eventType === "email.delivered") status = "DELIVERED";
    else if (eventType === "email.bounced") status = "BOUNCED";
    else if (eventType === "email.clicked") status = "CLICKED";
    else if (eventType === "email.opened") status = "OPENED";
    else if (eventType === "email.sent") status = "SENT";

    console.log(`[Resend Webhook] Email ${data.email_id} status changed to ${status}`);

    return NextResponse.json({ message: "Webhook received" }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
