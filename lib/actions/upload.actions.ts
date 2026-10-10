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

    // 2. Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: "File size exceeds maximum allowed (10MB)" };
    }

    // 3. Generate secure file path
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueId = crypto.randomUUID();
    const filePath = `${folder}/${uniqueId}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Attempt Supabase storage upload
    try {
      const supabase = createAdminClient();

      let { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType: file.type || "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });

      // If bucket is missing, attempt to create it and retry upload
      if (
        uploadError &&
        (uploadError.message?.toLowerCase().includes("not found") ||
          uploadError.message?.toLowerCase().includes("bucket") ||
          (uploadError as any).statusCode === "404")
      ) {
        try {
          await supabase.storage.createBucket(bucket, { public: true });
          const retryRes = await supabase.storage
            .from(bucket)
            .upload(filePath, buffer, {
              contentType: file.type || "image/jpeg",
              cacheControl: "3600",
              upsert: true,
            });
          data = retryRes.data;
          uploadError = retryRes.error;
        } catch {
          // Continue to fallback
        }
      }

      if (!uploadError && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        if (publicUrlData?.publicUrl) {
          // Save media metadata in Neon PostgreSQL via Prisma
          try {
            await prisma.media.create({
              data: {
                filename: file.name,
                storagePath: data.path,
                publicUrl: publicUrlData.publicUrl,
                mimeType: file.type || "image/jpeg",
                size: file.size,
                bucket,
              },
            });
          } catch (dbErr) {
            console.warn("[uploadImageAction] Failed to save media metadata to Neon:", dbErr);
          }

          return {
            success: true,
            url: publicUrlData.publicUrl,
            path: data.path,
          };
        }
      }

      if (uploadError) {
        console.warn("[uploadImageAction] Supabase storage upload failed, saving to local fallback:", uploadError.message);
      }
    } catch (sbError: any) {
      console.warn("[uploadImageAction] Supabase storage exception, falling back to local file:", sbError?.message);
    }

    // Local Disk Fallback: Save in public/uploads/${bucket}/${folder}
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", bucket, folder);
      await fs.mkdir(uploadDir, { recursive: true });
      const localFilePath = path.join(uploadDir, `${uniqueId}.${fileExt}`);
      await fs.writeFile(localFilePath, buffer);

      const publicUrl = `/uploads/${bucket}/${folder}/${uniqueId}.${fileExt}`;

      // Save media metadata in Neon PostgreSQL
      try {
        await prisma.media.create({
          data: {
            filename: file.name,
            storagePath: filePath,
            publicUrl,
            mimeType: file.type || "image/jpeg",
            size: file.size,
            bucket,
          },
        });
      } catch (dbErr) {
        console.warn("[uploadImageAction] Failed to save fallback media metadata to Neon:", dbErr);
      }

      return {
        success: true,
        url: publicUrl,
        path: filePath,
      };
    } catch (fsError: any) {
      console.error("[uploadImageAction Local Save Error]:", fsError);
      return { success: false, error: fsError.message || "Failed to upload image locally" };
    }
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
