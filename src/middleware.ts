import { NextRequest, NextResponse } from "next/server";
import { unsealData } from "iron-session";
import { SessionData } from "@/lib/auth";

const protectedRoutes = ["/write", "/edit", "/drafts", "/settings"];
const adminOnlyRoutes = ["/settings"];

// Bot probe paths that will never be served by this app — return 403 immediately
const botPrefixes = [
  "/wp-admin",
  "/wp-login",
  "/wp-includes",
  "/wordpress",
  "/xmlrpc.php",
  "/phpmyadmin",
  "/cgi-bin",
  "/vendor",
  "/admin",
  "/.env",
  "/.git",
  "/.aws",
  "/config.php",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block known bot probe paths
  const isBot = botPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
  if (isBot) {
    return new NextResponse(null, { status: 403 });
  }

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
  matcher: [
    // Auth-protected routes
    "/write",
    "/edit/:path*",
    "/drafts",
    "/settings",
    // Bot blocklist
    "/wp-admin/:path*",
    "/wp-login.php",
    "/wp-includes/:path*",
    "/wordpress/:path*",
    "/xmlrpc.php",
    "/phpmyadmin/:path*",
    "/cgi-bin/:path*",
    "/vendor/:path*",
    "/admin/:path*",
    "/.env",
    "/.git/:path*",
    "/.aws/:path*",
    "/config.php",
  ],
};
