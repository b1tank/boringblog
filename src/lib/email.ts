import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@example.com";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${siteUrl}/reset-password?token=${token}`;

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "重置您的密码",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>重置密码</h2>
        <p>您好，</p>
        <p>我们收到了重置您密码的请求。请点击下方链接设置新密码：</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px;">
            重置密码
          </a>
        </p>
        <p>此链接将在 1 小时后失效。</p>
        <p>如果您没有请求重置密码，请忽略此邮件。</p>
      </div>
    `,
  });
}

export async function sendInviteEmail(
  email: string,
  name: string,
  tempPassword: string
) {
  const loginLink = `${siteUrl}/login`;

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "您已被邀请加入博客",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>欢迎加入！</h2>
        <p>${name}，您好！</p>
        <p>您已被邀请成为博客的作者。以下是您的登录信息：</p>
        <ul>
          <li><strong>邮箱：</strong>${email}</li>
          <li><strong>临时密码：</strong>${tempPassword}</li>
        </ul>
        <p>
          <a href="${loginLink}" style="display: inline-block; padding: 12px 24px; background-color: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px;">
            前往登录
          </a>
        </p>
        <p>请登录后尽快修改密码。</p>
      </div>
    `,
  });
}
