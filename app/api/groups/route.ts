import { NextResponse } from "next/server";
import { ChatType, MemberRole } from "@prisma/client";
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
      name?: string;
      description?: string;
      type?: ChatType;
      userIds?: string[];
    };

    const name = body.name?.trim();
    const description = body.description?.trim() || null;
    const type = body.type;
    const userIds = Array.from(new Set((body.userIds ?? []).filter(Boolean)));

    if (!name || !type || !["GROUP", "SUPERGROUP"].includes(type)) {
      return NextResponse.json(
        { error: "Name and valid type are required" },
        { status: 400 }
      );
    }

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one user" },
        { status: 400 }
      );
    }

    const users = await db.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: { id: true },
    });

    if (users.length !== userIds.length) {
      return NextResponse.json({ error: "One or more users not found" }, { status: 404 });
    }

    const chat = await db.chat.create({
      data: {
        type,
        name,
        description,
        creatorId: currentUserId,
        members: {
          create: [
            { userId: currentUserId, role: MemberRole.OWNER },
            ...userIds.map((userId) => ({ userId, role: MemberRole.MEMBER })),
          ],
        },
      },
      select: { id: true },
    });

    if (type === ChatType.SUPERGROUP) {
      await db.topic.create({
        data: {
          chatId: chat.id,
          name: "General",
        },
      });
    }

    return NextResponse.json({ chatId: chat.id, created: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}