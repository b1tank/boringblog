import { NextRequest, NextResponse } from "next/server";
import { unsealData } from "iron-session";
import { SessionData } from "@/lib/auth";

const protectedRoutes = ["/write", "/edit", "/drafts", "/settings"];
const adminOnlyRoutes = ["/settings"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route needs protection
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Read session from cookie
  const cookieValue = request.cookies.get("boringblog_session")?.value;

  if (!cookieValue) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const session = await unsealData<SessionData>(cookieValue, {
      password: process.env.SESSION_SECRET!,
    });

    if (!session.isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Admin-only route check
    const isAdminRoute = adminOnlyRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );

    if (isAdminRoute && session.role !== "ADMIN") {
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  } catch {
    // Invalid or expired session cookie
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/write", "/edit/:path*", "/drafts", "/settings"],
};
