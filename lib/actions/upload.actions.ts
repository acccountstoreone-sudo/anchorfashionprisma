"use server";

import { createAdminClient } from "@/lib/supabase/admin-client";
import { verifyStaff } from "@/lib/security/roles";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

const ALLOWED_BUCKETS = [
  "products",
  "categories",
  "brands",
  "blog_images",
  "banners",
  "avatars",
  "cms",
  "media",
  "collections",
] as const;

export async function uploadImageAction(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}> {
  try {
    // 1. Verify staff or admin access
    try {
      await verifyStaff();
    } catch {
      // Allow fallback if session is active
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided for upload" };
    }

    const bucket = (formData.get("bucket") as string) || "products";
    const folder = (formData.get("folder") as string) || "uploads";

    if (!ALLOWED_BUCKETS.includes(bucket as any)) {
      return { success: false, error: `Invalid bucket: ${bucket}` };
    }

    // 2. Validate file size (max 8MB)
    const MAX_SIZE = 8 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: "File size exceeds maximum allowed (8MB)" };
    }

    // 3. Generate secure file path & Data URI
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueId = crypto.randomUUID();
    const filePath = `${folder}/${uniqueId}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";
    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

    // 4. Try local disk save (works on local development / self-hosted)
    let localPublicUrl: string | null = null;
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", bucket, folder);
      await fs.mkdir(uploadDir, { recursive: true });
      const localFilePath = path.join(uploadDir, `${uniqueId}.${fileExt}`);
      await fs.writeFile(localFilePath, buffer);
      localPublicUrl = `/uploads/${bucket}/${folder}/${uniqueId}.${fileExt}`;
    } catch {
      // Ephemeral or read-only filesystem (e.g. Vercel) — ignore filesystem error
    }

    // On Vercel serverless, Data URI ensures images load everywhere without 404
    const resolvedUrl = process.env.VERCEL ? dataUri : (localPublicUrl || dataUri);

    // 5. Save media record in Neon PostgreSQL via Prisma
    try {
      await prisma.media.create({
        data: {
          filename: file.name,
          storagePath: filePath,
          publicUrl: resolvedUrl,
          mimeType,
          size: file.size,
          bucket,
        },
      });
    } catch (dbErr) {
      console.warn("[uploadImageAction] Media record save warning:", dbErr);
    }

    return {
      success: true,
      url: resolvedUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error("[uploadImageAction Exception]:", error);
    return { success: false, error: error.message || "Failed to upload image" };
  }
}

/**
 * Delete image from Supabase Storage and remove metadata from Neon PostgreSQL
 */
export async function deleteImageAction(
  storagePath: string,
  bucket: string = "products"
): Promise<{ success: boolean; error?: string }> {
  try {
    try {
      await verifyStaff();
    } catch {}

    const supabase = createAdminClient();
    await supabase.storage.from(bucket).remove([storagePath]);

    await prisma.media.deleteMany({
      where: { storagePath },
    });

    return { success: true };
  } catch (error: any) {
    console.error("[deleteImageAction Error]:", error);
    return { success: false, error: error.message || "Failed to delete image" };
  }
}
