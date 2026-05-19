import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type Params = {
  params: {
    chatId: string;
    messageId: string;
  };
};

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, messageId } = await params;

    const message = await db.message.findFirst({
      where: {
        id: messageId,
        chatId,
        senderId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await db.message.delete({
      where: { id: messageId },
    });

    await db.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHAT_MESSAGE_DELETE]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
