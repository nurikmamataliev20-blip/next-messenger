import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      chatId?: string;
      name?: string;
      icon?: string;
    };

    const chatId = body.chatId;
    const name = body.name?.trim();
    const icon = body.icon?.trim() || null;

    if (!chatId || !name) {
      return NextResponse.json(
        { error: "chatId and name are required" },
        { status: 400 }
      );
    }

    const membership = await db.chatMember.findFirst({
      where: {
        chatId,
        userId: currentUserId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (![MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const topic = await db.topic.create({
      data: {
        chatId,
        name,
        icon,
      },
    });

    return NextResponse.json({ topic }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}