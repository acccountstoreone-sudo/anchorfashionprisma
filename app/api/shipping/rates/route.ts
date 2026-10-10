import { NextResponse } from "next/server";
import { RateCalculatorService } from "@/services/shipping/rate-calculator.service";
import { shippingRateQuerySchema } from "@/schemas/shipping.schema";

/**
 * GET /api/shipping/rates?district=Dhaka&weightKg=0.5&orderValue=500&isCOD=false
 * Calculate shipping rates — used at checkout and product pages.
 * Public endpoint (no auth required) since rates are shown to unauthenticated users.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());

    const parse = shippingRateQuerySchema.safeParse(rawParams);
    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.errors[0]?.message ?? "Invalid parameters" },
        { status: 400 }
      );
    }

    const { district, city, weightKg, orderValue, isCOD } = parse.data;
    const calculator = new RateCalculatorService();

    const zone = await calculator.getZoneByAddress(district, city);

    if (!zone) {
      return NextResponse.json({
        success: true,
        data: {
          total: 0,
          baseRate: 0,
          weightCharge: 0,
          codCharge: 0,
          isFreeShipping: false,
          zone: null,
          rate: null,
        },
      });
    }

    const calculation = await calculator.calculateShippingCharge(
      zone.id,
      weightKg,
      orderValue,
      isCOD
    );

    return NextResponse.json(
      { success: true, data: calculation },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch (err: any) {
    console.error("[Rates API] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shipping/rates
 * Calculate rates from a JSON body (used by checkout).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parse = shippingRateQuerySchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: parse.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { district, city, weightKg, orderValue, isCOD } = parse.data;
    const calculator = new RateCalculatorService();
    const zone = await calculator.getZoneByAddress(district, city);

    if (!zone) {
      return NextResponse.json({
        success: true,
        data: {
          total: 0,
          baseRate: 0,
          weightCharge: 0,
          codCharge: 0,
          isFreeShipping: false,
          zone: null,
          rate: null,
        },
      });
    }

    const calculation = await calculator.calculateShippingCharge(
      zone.id,
      weightKg,
      orderValue,
      isCOD
    );
    return NextResponse.json({ success: true, data: calculation });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
