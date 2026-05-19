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

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (!q) {
      return NextResponse.json({ users: [] });
    }

    const users = await db.user.findMany({
      where: {
        id: { not: userId },
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
      },
      take: 20,
      orderBy: {
        username: "asc",
      },
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}