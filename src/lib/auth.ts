import { SessionOptions, getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: string;
  role: "ADMIN" | "AUTHOR";
  name: string;
  isLoggedIn: boolean;
}

/**
 * Get session from cookies. Returns null if not logged in or invalid.
 * Safe to call in server components and API routes.
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    return session.isLoggedIn ? session : null;
  } catch {
    return null;
  }
}

export const defaultSession: SessionData = {
  userId: "",
  role: "AUTHOR",
  name: "",
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "boringblog_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};
