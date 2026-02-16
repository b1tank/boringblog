import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import sharp from "sharp";
import crypto from "crypto";
import { uploadImage } from "@/lib/storage";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "文件大小不能超过10MB" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "只能上传图片文件" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const optimized = await sharp(buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const hex = crypto.randomBytes(8).toString("hex");
    const fileName = `${Date.now()}-${hex}.webp`;

    // Use Azure Blob if configured, otherwise fallback to local storage
    if (process.env.AZURE_STORAGE_ACCOUNT_KEY) {
      const url = await uploadImage(optimized, fileName, "image/webp");
      return NextResponse.json({ url });
    }

    // Local fallback for development
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, fileName), optimized);
    const url = `/uploads/${fileName}`;
    return NextResponse.json({ url });
  } catch (error) {
    logger.error("Upload error", { error: String(error) });
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
