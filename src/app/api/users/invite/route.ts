import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { SessionData, sessionOptions } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "无权执行此操作" },
        { status: 403 }
      );
    }

    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "请输入姓名和邮箱" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      );
    }

    const tempPassword = crypto.randomBytes(4).toString("hex"); // 8 hex chars
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "AUTHOR",
      },
    });

    await sendInviteEmail(email, name, tempPassword);

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch {
    return NextResponse.json(
      { error: "邀请失败，请稍后再试" },
      { status: 500 }
    );
  }
}
