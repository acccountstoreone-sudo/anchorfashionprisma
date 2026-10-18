import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activePromotion = await prisma.promotions.findFirst({
      where: {
        is_active: true,
      },
      orderBy: {
        updated_at: "desc",
      },
    });

    if (!activePromotion) {
      return NextResponse.json({ promotion: null });
    }

    return NextResponse.json({
      promotion: {
        id: activePromotion.id,
        title: activePromotion.title,
        description: activePromotion.description,
        code: activePromotion.code,
        type: activePromotion.type,
        value: activePromotion.value ? Number(activePromotion.value) : 15,
        isActive: activePromotion.is_active,
      },
    });
  } catch (error) {
    console.error("[API_ACTIVE_PROMOTION_ERROR]", error);
    return NextResponse.json(
      {
        promotion: {
          id: "default",
          title: "Join Anchor VIP",
          description:
            "Get 15% off your first order when you sign up for our loyalty program.",
          code: "ANCHORVIP15",
          type: "PERCENTAGE",
          value: 15,
          isActive: true,
        },
      },
      { status: 200 }
    );
  }
}
