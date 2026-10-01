import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncClassroomConnection } from "@/lib/google-classroom-sync";

function isAuthorized(request: Request, secret: string): boolean {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const actual = Buffer.from(supplied);
  const expected = Buffer.from(secret);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Scheduled sync is not configured." }, { status: 503 });
  if (!isAuthorized(request, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const connections = await prisma.googleClassroomUserConnection.findMany({
    where: { status: "CONNECTED", encryptedRefreshToken: { not: null } },
  });
  let succeeded = 0;
  let failed = 0;
  for (const connection of connections) {
    try {
      await syncClassroomConnection(connection);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  return NextResponse.json({ processed: connections.length, succeeded, failed });
}
