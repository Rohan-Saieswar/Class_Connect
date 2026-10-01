import { NextResponse } from "next/server";
import { getClassroomContext } from "@/lib/classroom-access";
import { createConnectedClassroomClient } from "@/lib/google-classroom";
import { decryptClassroomToken } from "@/lib/classroom-tokens";
import { prisma } from "@/lib/prisma";
import { syncClassroomConnection } from "@/lib/google-classroom-sync";

export async function GET(_request: Request, { params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: section } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.connection) {
    return NextResponse.json({ connected: false, workspace: context.workspace.displayName });
  }

  const [courses, announcements, coursework, materials, submissions, syncHistory] = await Promise.all([
    prisma.googleClassroomCourse.count({ where: { connectionId: context.connection.id, userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false } }),
    prisma.googleClassroomAnnouncement.count({ where: { connectionId: context.connection.id, userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false } }),
    prisma.googleClassroomCoursework.count({ where: { connectionId: context.connection.id, userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false } }),
    prisma.googleClassroomMaterial.count({ where: { connectionId: context.connection.id, userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false } }),
    prisma.googleClassroomSubmission.count({ where: { connectionId: context.connection.id, userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false } }),
    prisma.googleClassroomSyncLog.findMany({
      where: { connectionId: context.connection.id, userId: context.user.id, workspaceId: context.workspace.id },
      select: { status: true, errorCode: true, summaryJson: true, warningsJson: true, startedAt: true, completedAt: true },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);
  return NextResponse.json({
    connected: context.connection.status === "CONNECTED",
    status: context.connection.status,
    googleEmail: context.connection.googleEmail,
    lastSyncAt: context.connection.lastSyncAt,
    workspace: context.workspace.displayName,
    counts: { courses, announcements, coursework, materials, submissions },
    syncHistory,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: section } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.connection) return NextResponse.json({ error: "Connect Google Classroom first." }, { status: 409 });
  if (!new Set(["CONNECTED", "SYNC_FAILED"]).has(context.connection.status) || !context.connection.encryptedRefreshToken) {
    return NextResponse.json({ error: "Reconnect Google Classroom to continue syncing." }, { status: 409, headers: { "X-Classroom-Status": "REAUTH_REQUIRED" } });
  }

  try {
    const result = await syncClassroomConnection(context.connection);
    return NextResponse.json({ ok: true, lastSyncAt: result.syncedAt, counts: result.counts });
  } catch (error) {
    const category = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "CLASSROOM_SYNC_FAILED";
    if (process.env.NODE_ENV === "development") console.error("[GOOGLE_CLASSROOM_SYNC_FAILED]", { category });
    return NextResponse.json({ error: category }, { status: category === "REAUTH_REQUIRED" ? 401 : 502 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: section } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.connection) return NextResponse.json({ ok: true, connected: false });

  if (context.connection.encryptedRefreshToken) {
    try {
      const client = createConnectedClassroomClient(context.connection);
      await client.revokeToken(decryptClassroomToken(context.connection.encryptedRefreshToken));
    } catch {
      if (process.env.NODE_ENV === "development") console.warn("[GOOGLE_CLASSROOM_REVOKE_FAILED]", { userId: context.user.id });
    }
  }

  await prisma.googleClassroomUserConnection.update({
    where: { id: context.connection.id },
    data: {
      status: "DISCONNECTED",
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      accessTokenExpiresAt: null,
      disconnectedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true, connected: false, retainedHistoricalCache: true });
}
