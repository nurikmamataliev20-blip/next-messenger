import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.chatMember.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const chats = memberships
      .map(({ chat }) => {
        const peer =
          chat.type === "DIRECT"
            ? chat.members.find((m) => m.userId !== userId)?.user
            : null;

        const lastMessage = chat.messages[0] ?? null;

        return {
          id: chat.id,
          type: chat.type,
          name: chat.name || peer?.name || peer?.username || "Direct Chat",
          avatar: chat.avatar || peer?.avatar || null,
          membersCount: chat.members.length,
          lastMessage: lastMessage?.content || "No messages yet",
          lastMessageAt: lastMessage?.createdAt || chat.updatedAt,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
      );

    return NextResponse.json({ chats });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { userId?: string };
    const targetUserId = body.userId;

    if (!targetUserId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { error: "Cannot create a direct chat with yourself" },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingMembership = await db.chatMember.findFirst({
      where: { userId: currentUserId },
      include: {
        chat: {
          include: {
            members: {
              select: { userId: true },
            },
          },
        },
      },
    });

    let existingChatId: string | null = null;

    if (existingMembership) {
      const candidateChats = await db.chat.findMany({
        where: {
          type: "DIRECT",
          members: {
            some: { userId: currentUserId },
          },
        },
        include: {
          members: {
            select: { userId: true },
          },
        },
      });

      const existingChat = candidateChats.find((chat) => {
        const memberIds = chat.members.map((member) => member.userId);
        return (
          memberIds.length === 2 &&
          memberIds.includes(currentUserId) &&
          memberIds.includes(targetUserId)
        );
      });

      existingChatId = existingChat?.id ?? null;
    }

    if (existingChatId) {
      return NextResponse.json({ chatId: existingChatId, created: false });
    }

    const chat = await db.chat.create({
      data: {
        type: "DIRECT",
        creatorId: currentUserId,
        members: {
          create: [{ userId: currentUserId }, { userId: targetUserId }],
        },
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({ chatId: chat.id, created: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}