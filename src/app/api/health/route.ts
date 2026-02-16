import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  // Check database connectivity
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    checks.db = "connected";
  } catch {
    checks.db = "unreachable";
    healthy = false;
  }

  const status = healthy ? "ok" : "degraded";
  const statusCode = healthy ? 200 : 503;

  return NextResponse.json(
    { status, checks, timestamp: new Date().toISOString() },
    { status: statusCode }
  );
}
