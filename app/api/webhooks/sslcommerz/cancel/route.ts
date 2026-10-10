import { NextRequest } from "next/server";
import { GET as callbackGET, POST as callbackPOST } from "@/app/api/payment/sslcommerz/callback/route";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return callbackGET(req);
}

export async function POST(req: NextRequest) {
  return callbackPOST(req);
}
