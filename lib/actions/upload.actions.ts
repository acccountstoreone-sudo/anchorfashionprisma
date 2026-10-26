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

// SECURITY: only raster images are accepted. SVG/HTML are excluded on purpose (script execution).
const ALLOWED_IMAGE_TYPES: Record<string, string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  avif: ["image/avif"],
};

function sanitizeSegment(seg: string): string {
  return seg.replace(/[^a-zA-Z0-9_-]/g, "");
}

function sanitizeFolder(folder: string): string {
  const cleaned = String(folder || "uploads")
    .split(/[\\/]+/)
    .map(sanitizeSegment)
    .filter(Boolean)
    .slice(0, 4)
    .join("/");
  return cleaned || "uploads";
}

export async function uploadImageAction(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}> {
  try {
    // 1. Verify staff or admin access (hard failure - no fallback)
    await verifyStaff();

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided for upload" };
    }

    const bucket = (formData.get("bucket") as string) || "products";
    const folder = sanitizeFolder((formData.get("folder") as string) || "uploads");

    if (!ALLOWED_BUCKETS.includes(bucket as any)) {
      return { success: false, error: `Invalid bucket: ${bucket}` };
    }

    // 2. Validate file size (max 8MB)
    const MAX_SIZE = 8 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: "File size exceeds maximum allowed (8MB)" };
    }

    // 3. Validate extension + declared MIME type, then generate secure file path & Data URI
    const fileExt = (file.name.split(".").pop() || "").toLowerCase();
    const allowedMimes = ALLOWED_IMAGE_TYPES[fileExt];
    if (!allowedMimes || !allowedMimes.includes(file.type)) {
      return {
        success: false,
        error: "Unsupported file type. Allowed: JPG, PNG, WEBP, GIF, AVIF.",
      };
    }
    const uniqueId = crypto.randomUUID();
    const filePath = `${folder}/${uniqueId}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;
    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

    // 4. Try local disk save (works on local development / self-hosted)
    let localPublicUrl: string | null = null;
    try {
      const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
      const uploadDir = path.resolve(uploadsRoot, bucket, folder);
      if (!uploadDir.startsWith(uploadsRoot + path.sep)) {
        throw new Error("Invalid upload directory");
      }
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
    await verifyStaff();

    if (!ALLOWED_BUCKETS.includes(bucket as any)) {
      return { success: false, error: `Invalid bucket: ${bucket}` };
    }
    // Reject traversal / odd characters in the storage path.
    if (
      typeof storagePath !== "string" ||
      storagePath.includes("..") ||
      !/^[a-zA-Z0-9_\-./]+$/.test(storagePath)
    ) {
      return { success: false, error: "Invalid storage path" };
    }

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
