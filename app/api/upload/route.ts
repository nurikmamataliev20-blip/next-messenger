import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

function getFileType(mimeType: string): "IMAGE" | "VIDEO" | "AUDIO" | "FILE" {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  return "FILE";
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("No file provided", { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${session.user.id}-${Date.now()}${path.extname(file.name)}`;
    const savePath = path.join(process.cwd(), "public/uploads", filename);

    await writeFile(savePath, buffer);

    const url = `/uploads/${filename}`;
    const type = getFileType(file.type);

    return NextResponse.json({
      url,
      type,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("UPLOAD_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
