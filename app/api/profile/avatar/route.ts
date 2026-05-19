import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const avatarFile = formData.get("avatar") as File;

    if (!avatarFile) {
      return new NextResponse("No avatar file provided", { status: 400 });
    }

    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    const filename = `${session.user.id}-${Date.now()}${path.extname(avatarFile.name)}`;
    const savePath = path.join(process.cwd(), "public/avatars", filename);
    
    await writeFile(savePath, buffer);

    const avatarUrl = `/avatars/${filename}`;

    await db.user.update({
      where: { id: session.user.id },
      data: { avatar: avatarUrl },
    });

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("AVATAR_UPLOAD_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
