import { NextResponse } from "next/server";
import { getClassroomContext } from "@/lib/classroom-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: section } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.connection) return NextResponse.json({ error: "Google Classroom is not connected." }, { status: 409 });

  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) || "";
  if (query.length < 2) return NextResponse.json({ results: [] });
  const ownership = { connectionId: context.connection.id, userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false };
  const contains = { contains: query };
  const [courses, announcements, coursework, materials, topics, attachments, submissions] = await Promise.all([
    prisma.googleClassroomCourse.findMany({ where: { ...ownership, OR: [{ name: contains }, { section: contains }, { description: contains }] }, take: 20 }),
    prisma.googleClassroomAnnouncement.findMany({ where: { ...ownership, OR: [{ text: contains }, { course: { name: contains } }] }, include: { course: { select: { id: true, name: true } } }, take: 20 }),
    prisma.googleClassroomCoursework.findMany({ where: { ...ownership, OR: [{ title: contains }, { description: contains }, { course: { name: contains } }] }, include: { course: { select: { id: true, name: true } } }, take: 20 }),
    prisma.googleClassroomMaterial.findMany({ where: { ...ownership, OR: [{ title: contains }, { description: contains }, { course: { name: contains } }] }, include: { course: { select: { id: true, name: true } } }, take: 20 }),
    prisma.googleClassroomTopic.findMany({ where: { ...ownership, name: contains }, include: { course: { select: { id: true, name: true } } }, take: 20 }),
    prisma.googleClassroomAttachment.findMany({ where: { ...ownership, OR: [{ title: contains }, { description: contains }, { attachmentType: contains }] }, take: 20 }),
    prisma.googleClassroomSubmission.findMany({ where: { ...ownership, OR: [{ coursework: { title: contains } }, { coursework: { course: { name: contains } } }] }, include: { coursework: { select: { id: true, title: true, course: { select: { name: true } } } } }, take: 20 }),
  ]);

  return NextResponse.json({ results: { courses, announcements, coursework, materials, topics, attachments, submissions } });
}
