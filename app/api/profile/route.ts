import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, username: true, bio: true, status: true, avatar: true },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("PROFILE_GET_ERROR", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, bio, status, username } = body;

    if (username) {
      const existingUser = await db.user.findFirst({
        where: {
          username: username,
          id: {
            not: session.user.id,
          },
        },
      });

      if (existingUser) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 });
      }
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { name, bio, status, username },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("PROFILE_PATCH_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
