import { NextResponse } from "next/server";
import { MessageType } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = {
  params: Promise<{
    chatId: string;
  }>;
};

async function ensureMembership(chatId: string, userId: string) {
  return db.chatMember.findFirst({
    where: {
      chatId,
      userId,
    },
  });
}

export async function GET(req: Request, { params }: Params) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get("topicId");

    const membership = await ensureMembership(chatId, userId);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const chat = await db.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        type: true,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const [topics, myMembership, messages] = await Promise.all([
      db.topic.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          icon: true,
        },
      }),
      db.chatMember.findFirst({
        where: {
          chatId,
          userId,
        },
        select: {
          role: true,
        },
      }),
      db.message.findMany({
        where: {
          chatId,
          ...(topicId ? { topicId } : {}),
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          type: true,
          fileUrl: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          createdAt: true,
          edited: true,
          topicId: true,
          senderId: true,
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      chat: {
        id: chat.id,
        type: chat.type,
        topics,
        myRole: myMembership?.role ?? null,
      },
      messages: messages.map((message) => ({
        id: message.id,
        content: message.content,
        type: message.type,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        mimeType: message.mimeType,
        createdAt: message.createdAt,
        senderId: message.senderId,
        edited: message.edited,
        isMine: message.sender.id === userId,
        sender: message.sender,
        topicId: message.topicId,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    const membership = await ensureMembership(chatId, userId);

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as {
      content?: string;
      topicId?: string | null;
      type?: MessageType;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    };

    const content = body.content?.trim();
    const topicId = body.topicId ?? null;

    if (!content && !body.fileUrl) {
      return NextResponse.json(
        { error: "Message content or file is required" },
        { status: 400 }
      );
    }

    if (topicId) {
      const topic = await db.topic.findFirst({
        where: {
          id: topicId,
          chatId,
        },
        select: {
          id: true,
        },
      });

      if (!topic) {
        return NextResponse.json({ error: "Topic not found" }, { status: 404 });
      }
    }

    const message = await db.message.create({
      data: {
        chatId,
        topicId,
        senderId: userId,
        type: body.type || MessageType.TEXT,
        content: content || "",
        fileUrl: body.fileUrl,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    await db.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(
      {
        message: {
          id: message.id,
          content: message.content,
          type: message.type,
          createdAt: message.createdAt,
          senderId: message.senderId,
          isMine: true,
          sender: message.sender,
          topicId: message.topicId,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
