import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { email, username, name, password } = await req.json()

    if (!email || !username || !name || !password) {
      return NextResponse.json(
        { error: "Все поля обязательны" },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь уже существует" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await db.user.create({
      data: { email, username, name, password: hashedPassword },
    })

    return NextResponse.json({ message: "OK", userId: user.id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}