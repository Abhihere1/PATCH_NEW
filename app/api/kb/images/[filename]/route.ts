import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const KB_IMAGES_DIR = path.join(process.cwd(), "knowledge_base", "images");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitize to prevent path traversal
  const safe = path.basename(filename);
  const filePath = path.join(KB_IMAGES_DIR, safe);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(safe).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };

  const contentType = mimeTypes[ext] ?? "application/octet-stream";
  return new NextResponse(buffer, { headers: { "Content-Type": contentType } });
}
