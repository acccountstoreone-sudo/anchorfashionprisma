"use server";

import { seoService } from "@/services/seo.service";
import { SEOMetadata } from "@/types/seo.types";
import { revalidatePath } from "next/cache";
import { verifyStaff } from "@/lib/security/roles";

export async function getMetadataByEntity(
  entityType: string,
  entityId: string
): Promise<SEOMetadata | null> {
  return await seoService.getMetadataByEntity(entityType, entityId);
}

export async function upsertMetadata(data: unknown): Promise<SEOMetadata> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  const metadata = await seoService.upsertMetadata(data);
  revalidatePath("/admin/seo");
  // Dynamic revalidation based on entity would go here
  return metadata;
}

export async function getAllMetadata(): Promise<SEOMetadata[]> {
  // SECURITY: server actions are public endpoints; authorize every call.
  await verifyStaff();
  return await seoService.getAllMetadata();
}
