import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, defaultSession, sessionOptions } from "@/lib/auth";

export async function GET() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return NextResponse.json(defaultSession);
  }

  return NextResponse.json({
    isLoggedIn: true,
    userId: session.userId,
    name: session.name,
    role: session.role,
  });
}
