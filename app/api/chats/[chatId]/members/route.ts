import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { chatId } = await params;

    // First, verify the user is part of the chat
    const chatMembership = await db.chatMember.findFirst({
      where: {
        chatId: chatId,
        userId: session.user.id,
      },
    });

    if (!chatMembership) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // If they are a member, fetch all members
    const members = await db.chatMember.findMany({
      where: { chatId },
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
    });

    const formattedMembers = members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      username: member.user.username,
      avatar: member.user.avatar,
      role: member.role,
    }));

    return NextResponse.json(formattedMembers);
  } catch (error) {
    console.error("[MEMBERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
