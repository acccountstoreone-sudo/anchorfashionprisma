"use server";

import { seoService } from "@/services/seo.service";
import { SEOMetadata } from "@/types/seo.types";
import { revalidatePath } from "next/cache";

export async function getMetadataByEntity(
  entityType: string,
  entityId: string
): Promise<SEOMetadata | null> {
  return await seoService.getMetadataByEntity(entityType, entityId);
}

export async function upsertMetadata(data: unknown): Promise<SEOMetadata> {
  const metadata = await seoService.upsertMetadata(data);
  revalidatePath("/admin/seo");
  // Dynamic revalidation based on entity would go here
  return metadata;
}

export async function getAllMetadata(): Promise<SEOMetadata[]> {
  return await seoService.getAllMetadata();
}
