import { NextResponse } from "next/server";
import { getClassroomContext } from "@/lib/classroom-access";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: section } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.connection) {
    return NextResponse.json({ error: "Google Classroom has not been connected in this workspace." }, { status: 409 });
  }

  const ownership = {
    connectionId: context.connection.id,
    userId: context.user.id,
    workspaceId: context.workspace.id,
  };
  const [courses, announcements, coursework, materials, topics, submissions, notifications, attachments] = await Promise.all([
    prisma.googleClassroomCourse.findMany({ where: { ...ownership, isRemoved: false }, orderBy: { name: "asc" } }),
    prisma.googleClassroomAnnouncement.findMany({ where: { ...ownership, isRemoved: false, course: { isRemoved: false } }, include: { course: { select: { name: true, section: true } } }, orderBy: { googleCreatedAt: "desc" } }),
    prisma.googleClassroomCoursework.findMany({
      where: { ...ownership, isRemoved: false, course: { isRemoved: false } },
      include: {
        course: { select: { name: true, section: true } },
        submissions: { where: { userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false }, select: { state: true, late: true, assignedGrade: true, alternateLink: true, googleUpdatedAt: true } },
      },
      orderBy: { googleUpdatedAt: "desc" },
    }),
    prisma.googleClassroomMaterial.findMany({ where: { ...ownership, isRemoved: false, course: { isRemoved: false } }, include: { course: { select: { name: true, section: true } } }, orderBy: { googleCreatedAt: "desc" } }),
    prisma.googleClassroomTopic.findMany({ where: { ...ownership, isRemoved: false, course: { isRemoved: false } }, include: { course: { select: { name: true } } }, orderBy: { position: "asc" } }),
    prisma.googleClassroomSubmission.findMany({
      where: { ...ownership, userId: context.user.id, isRemoved: false, coursework: { isRemoved: false, course: { isRemoved: false } } },
      include: { coursework: { include: { course: { select: { name: true, section: true } } } } },
      orderBy: { googleUpdatedAt: "desc" },
    }),
    prisma.googleClassroomNotification.findMany({ where: { ...ownership, userId: context.user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.googleClassroomAttachment.findMany({ where: { ...ownership, isRemoved: false }, orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({
    courses,
    announcements,
    coursework,
    materials,
    topics,
    submissions,
    notifications,
    attachments,
    lastSyncAt: context.connection.lastSyncAt,
    historical: context.connection.status !== "CONNECTED",
    connectionStatus: context.connection.status,
  });
}
