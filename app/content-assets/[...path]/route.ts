import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const ALLOWED_EXTENSIONS = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".gif", "image/gif"],
  [".avif", "image/avif"],
]);

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: rawParts } = await context.params;
  const safeParts = rawParts.filter(Boolean);
  const targetPath = path.resolve(CONTENT_ROOT, ...safeParts);
  if (!targetPath.startsWith(path.resolve(CONTENT_ROOT))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(targetPath).toLowerCase();
  const mimeType = ALLOWED_EXTENSIONS.get(ext);
  if (!mimeType || !fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = fs.readFileSync(targetPath);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
