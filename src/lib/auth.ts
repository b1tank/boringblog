import { SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
  role: "ADMIN" | "AUTHOR";
  name: string;
  isLoggedIn: boolean;
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
