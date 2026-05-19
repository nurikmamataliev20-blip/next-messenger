import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return NextResponse.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("[NOTIFICATIONS_READ_ALL_PATCH]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
