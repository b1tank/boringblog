import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { generateResetToken } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "请输入邮箱地址" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user) {
      const resetToken = generateResetToken();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      await sendPasswordResetEmail(user.email, resetToken);
    }

    // Always return success to avoid revealing if email exists
    return NextResponse.json({
      success: true,
      message: "如果该邮箱已注册，重置链接已发送",
    });
  } catch {
    return NextResponse.json(
      { error: "操作失败，请稍后再试" },
      { status: 500 }
    );
  }
}
