import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, title, body: notificationBody, data } = body;

    if (!type || !title || !notificationBody) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        body: notificationBody,
        data,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("[NOTIFICATIONS_POST]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
