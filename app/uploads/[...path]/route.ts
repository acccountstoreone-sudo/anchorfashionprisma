import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await context.params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("File path required", { status: 400 });
    }

    // Sanitize path segments to prevent directory traversal
    const safeSegments = pathSegments
      .map((seg) => seg.replace(/[^a-zA-Z0-9._-]/g, ""))
      .filter((seg) => Boolean(seg) && seg !== "." && seg !== "..");

    if (safeSegments.length === 0) {
      return new NextResponse("Invalid file path", { status: 400 });
    }

    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const filePath = path.resolve(uploadsDir, ...safeSegments);

    // Strict jail verification - ensure resolved path is inside public/uploads
    if (!filePath.startsWith(uploadsDir + path.sep)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Verify existence
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return new NextResponse("Not a file", { status: 404 });
      }

      const fileBuffer = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(stats.size),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return new NextResponse("File not found", { status: 404 });
    }
  } catch (err: any) {
    console.error("[Uploads Route Error]:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

