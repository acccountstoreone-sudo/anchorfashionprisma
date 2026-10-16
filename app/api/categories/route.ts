import { NextResponse } from "next/server";
import { CatalogRepository } from "@/repositories/catalog.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await CatalogRepository.getCategories();
    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error: any) {
    console.error("[api/categories] Error fetching categories:", error);
    return NextResponse.json([], { status: 500 });
  }
}
