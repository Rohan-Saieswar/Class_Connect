import { NextResponse } from "next/server";
import { getClassroomContext } from "@/lib/classroom-access";
import { prisma } from "@/lib/prisma";

const ALLOWED_CATEGORIES = [
  "GENERAL",
  "ACADEMIC",
  "EXAMINATION",
  "ASSIGNMENT",
  "ATTENDANCE",
  "EVENT",
  "FACULTY",
  "ADMINISTRATIVE",
  "URGENT",
] as const;

const ALLOWED_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const POST_ROLES = new Set(["CR", "FACULTY", "MODERATOR", "SYSTEM_ADMIN"]);
const MANAGE_ROLES = new Set(["CR", "MODERATOR", "SYSTEM_ADMIN"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspace: string }> },
) {
  const { workspace: section } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      workspaceId: context.workspace.id,
      status: "PUBLISHED",
      publishedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          memberships: {
            where: { workspaceId: context.workspace.id },
            select: { role: true },
          },
        },
      },
      subject: {
        select: { name: true, code: true },
      },
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 100,
  });

  const formatted = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    category: a.category,
    priority: a.priority,
    isPinned: a.isPinned,
    publishedAt: a.publishedAt.toISOString(),
    expiresAt: a.expiresAt?.toISOString() ?? null,
    authorId: a.authorId,
    authorName: a.author.name,
    authorRole: a.author.memberships[0]?.role ?? "STUDENT",
    subject: a.subject?.name ?? a.subject?.code ?? "General",
  }));

  return NextResponse.json({
    announcements: formatted,
    canPost: POST_ROLES.has(context.membership.role),
    canManage: MANAGE_ROLES.has(context.membership.role),
    currentUserId: context.user.id,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspace: string }> },
) {
  const { workspace: section } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  if (!POST_ROLES.has(context.membership.role)) {
    return NextResponse.json(
      { error: "You do not have permission to post announcements." },
      { status: 403 },
    );
  }

  let body: {
    title?: unknown;
    content?: unknown;
    category?: unknown;
    priority?: unknown;
    isPinned?: unknown;
    expiresAt?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const rawTitle = typeof body.title === "string" ? body.title.trim() : "";
  const rawContent = typeof body.content === "string" ? body.content.trim() : "";

  if (!rawTitle) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (rawTitle.length > 150) {
    return NextResponse.json(
      { error: "Title must not exceed 150 characters." },
      { status: 400 },
    );
  }

  if (!rawContent) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }
  if (rawContent.length > 5000) {
    return NextResponse.json(
      { error: "Content must not exceed 5000 characters." },
      { status: 400 },
    );
  }

  const category = (
    typeof body.category === "string" ? body.category.trim().toUpperCase() : "GENERAL"
  ) as (typeof ALLOWED_CATEGORIES)[number];
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `Category must be one of: ${ALLOWED_CATEGORIES.join(", ")}` },
      { status: 400 },
    );
  }

  const priority = (
    typeof body.priority === "string" ? body.priority.trim().toUpperCase() : "MEDIUM"
  ) as (typeof ALLOWED_PRIORITIES)[number];
  if (!ALLOWED_PRIORITIES.includes(priority)) {
    return NextResponse.json(
      { error: `Priority must be one of: ${ALLOWED_PRIORITIES.join(", ")}` },
      { status: 400 },
    );
  }

  let expiresAt: Date | null = null;
  if (body.expiresAt && typeof body.expiresAt === "string") {
    const parsed = new Date(body.expiresAt);
    if (!Number.isNaN(parsed.getTime())) {
      expiresAt = parsed;
    }
  }

  const isPinned = Boolean(body.isPinned);

  const announcement = await prisma.announcement.create({
    data: {
      workspaceId: context.workspace.id,
      authorId: context.user.id,
      title: rawTitle,
      content: rawContent,
      category,
      priority,
      status: "PUBLISHED",
      isPinned,
      publishedAt: new Date(),
      expiresAt,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          memberships: {
            where: { workspaceId: context.workspace.id },
            select: { role: true },
          },
        },
      },
      subject: {
        select: { name: true, code: true },
      },
    },
  });

  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "ANNOUNCEMENT_CREATE",
        targetType: "ANNOUNCEMENT",
        targetId: announcement.id,
        newStateJson: JSON.stringify({
          title: announcement.title,
          category: announcement.category,
          priority: announcement.priority,
          isPinned: announcement.isPinned,
        }),
      },
    });
  } catch {
    // Logging failure never blocks the request
  }

  return NextResponse.json(
    {
      ok: true,
      announcement: {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        priority: announcement.priority,
        isPinned: announcement.isPinned,
        publishedAt: announcement.publishedAt.toISOString(),
        expiresAt: announcement.expiresAt?.toISOString() ?? null,
        authorId: announcement.authorId,
        authorName: announcement.author.name,
        authorRole: announcement.author.memberships[0]?.role ?? context.membership.role,
        subject: announcement.subject?.name ?? announcement.subject?.code ?? "General",
      },
    },
    { status: 201 },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspace: string }> },
) {
  const { workspace: section } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  if (!POST_ROLES.has(context.membership.role)) {
    return NextResponse.json(
      { error: "You do not have permission to pin announcements." },
      { status: 403 },
    );
  }

  let body: { id?: unknown; isPinned?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Announcement id is required." }, { status: 400 });
  }
  if (typeof body.isPinned !== "boolean") {
    return NextResponse.json(
      { error: "isPinned boolean is required." },
      { status: 400 },
    );
  }

  const result = await prisma.announcement.updateMany({
    where: {
      id: body.id,
      workspaceId: context.workspace.id,
    },
    data: {
      isPinned: body.isPinned,
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Announcement not found in this workspace." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, isPinned: body.isPinned });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ workspace: string }> },
) {
  const { workspace: section } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  if (!POST_ROLES.has(context.membership.role)) {
    return NextResponse.json(
      { error: "You do not have permission to delete announcements." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Announcement id is required." }, { status: 400 });
  }

  const deleteWhere: { id: string; workspaceId: string; authorId?: string } = {
    id,
    workspaceId: context.workspace.id,
  };

  if (context.membership.role === "FACULTY") {
    deleteWhere.authorId = context.user.id;
  }

  const target = await prisma.announcement.findFirst({
    where: deleteWhere,
    select: { id: true, title: true, authorId: true },
  });

  if (!target) {
    return NextResponse.json(
      { error: "Announcement not found or unauthorized to delete." },
      { status: 404 },
    );
  }

  await prisma.announcement.deleteMany({
    where: deleteWhere,
  });

  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "ANNOUNCEMENT_DELETE",
        targetType: "ANNOUNCEMENT",
        targetId: target.id,
        previousStateJson: JSON.stringify({
          title: target.title,
          authorId: target.authorId,
        }),
      },
    });
  } catch {
    // Logging failure never blocks the request
  }

  return NextResponse.json({ ok: true, deletedId: id });
}
