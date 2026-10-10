import { NextRequest } from "next/server";
import { POST as ipnPOST } from "@/app/api/payment/sslcommerz/ipn/route";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return ipnPOST(req);
}
