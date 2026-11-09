import { NextResponse } from "next/server";
import { getClassroomContext } from "@/lib/classroom-access";
import { prisma } from "@/lib/prisma";

const POSTER_ROLES = ["CR", "FACULTY"];
const CATEGORIES = ["GENERAL", "ACADEMIC", "EXAMINATION", "ASSIGNMENT", "ATTENDANCE", "EVENT", "FACULTY", "ADMINISTRATIVE", "URGENT"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type Ctx = { params: Promise<{ workspace: string }> };
type Access = { workspaceId: string; userId: string; role: string; canPost: boolean };

async function getAccess(params: Ctx["params"]) {
  const { workspace: section } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) {
    return { ok: false as const, response: NextResponse.json({ error: context.error }, { status: context.status }) };
  }
  const workspaceId = context.workspace.id as string;
  const userId = context.user.id as string;
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    select: { role: true, status: true },
  });
  if (!membership || membership.status !== "APPROVED") {
    return { ok: false as const, response: NextResponse.json({ error: "Not a member of this workspace." }, { status: 403 }) };
  }
  const access: Access = { workspaceId, userId, role: membership.role, canPost: POSTER_ROLES.includes(membership.role) };
  return { ok: true as const, access };
}

// CRs can edit anything; teachers only their own announcements.
function canEditItem(access: Access, authorId: string) {
  if (!access.canPost) return false;
  return access.role === "CR" || authorId === access.userId;
}

function parseEventDate(value: unknown): { ok: true; date: Date | null } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, date: null };
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { ok: false };
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? { ok: false } : { ok: true, date };
}

async function audit(workspaceId: string, actorId: string, action: string, targetId: string, detail: object) {
  try {
    await prisma.auditLog.create({
      data: { workspaceId, actorId, action, targetType: "ANNOUNCEMENT", targetId, newStateJson: JSON.stringify(detail) },
    });
  } catch {
    // an audit failure must never block the request
  }
}

type Row = {
  id: string; title: string; content: string; category: string; priority: string; isPinned: boolean;
  publishedAt: Date; eventDate: Date | null; editedAt: Date | null; authorId: string; author: { name: string };
};

function toDto(row: Row, authorRole: string, access: Access) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    priority: row.priority,
    isPinned: row.isPinned,
    publishedAt: row.publishedAt.toISOString(),
    eventDate: row.eventDate ? row.eventDate.toISOString() : null,
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    authorId: row.authorId,
    authorName: row.author.name,
    authorRole,
    canEdit: canEditItem(access, row.authorId),
  };
}

export async function GET(_req: Request, { params }: Ctx) {
  const result = await getAccess(params);
  if (!result.ok) return result.response;
  const { access } = result;

  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: {
      workspaceId: access.workspaceId,
      status: "PUBLISHED",
      publishedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 100,
    include: { author: { select: { name: true } } },
  });

  const authorIds = Array.from(new Set(rows.map((r) => r.authorId)));
  const memberships = await prisma.workspaceMembership.findMany({
    where: { workspaceId: access.workspaceId, userId: { in: authorIds } },
    select: { userId: true, role: true },
  });
  const roleByUser = new Map(memberships.map((m) => [m.userId, m.role]));

  return NextResponse.json({
    canPost: access.canPost,
    announcements: rows.map((r) => toDto(r, roleByUser.get(r.authorId) ?? "MEMBER", access)),
  });
}

export async function POST(request: Request, { params }: Ctx) {
  const result = await getAccess(params);
  if (!result.ok) return result.response;
  const { access } = result;
  if (!access.canPost) return NextResponse.json({ error: "Only CRs and teachers can post." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const content = String(body?.content ?? "").trim();
  const category = String(body?.category ?? "GENERAL");
  const priority = String(body?.priority ?? "MEDIUM");
  const isPinned = body?.isPinned === true;
  const eventDate = parseEventDate(body?.eventDate);

  if (!title || !content) return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
  if (title.length > 150 || content.length > 5000) return NextResponse.json({ error: "Input too long." }, { status: 400 });
  if (!CATEGORIES.includes(category) || !PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: "Invalid category or priority." }, { status: 400 });
  }
  if (!eventDate.ok) return NextResponse.json({ error: "Invalid date." }, { status: 400 });

  const created = await prisma.announcement.create({
    data: {
      workspaceId: access.workspaceId, authorId: access.userId, title, content, category, priority,
      isPinned, status: "PUBLISHED", eventDate: eventDate.date,
    },
    include: { author: { select: { name: true } } },
  });
  await audit(access.workspaceId, access.userId, "ANNOUNCEMENT_CREATE", created.id, { title });
  return NextResponse.json({ announcement: toDto(created, access.role, access) }, { status: 201 });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const result = await getAccess(params);
  if (!result.ok) return result.response;
  const { access } = result;

  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const existing = await prisma.announcement.findFirst({ where: { id, workspaceId: access.workspaceId } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!canEditItem(access, existing.authorId)) {
    return NextResponse.json({ error: "You can only edit your own announcements." }, { status: 403 });
  }

  const data: {
    title?: string; content?: string; category?: string; priority?: string;
    eventDate?: Date | null; isPinned?: boolean; editedAt?: Date;
  } = {};
  let contentChanged = false;

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title || title.length > 150) return NextResponse.json({ error: "Invalid title." }, { status: 400 });
    if (title !== existing.title) { data.title = title; contentChanged = true; }
  }
  if (typeof body.content === "string") {
    const content = body.content.trim();
    if (!content || content.length > 5000) return NextResponse.json({ error: "Invalid message." }, { status: 400 });
    if (content !== existing.content) { data.content = content; contentChanged = true; }
  }
  if (typeof body.category === "string") {
    if (!CATEGORIES.includes(body.category)) return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    if (body.category !== existing.category) { data.category = body.category; contentChanged = true; }
  }
  if (typeof body.priority === "string") {
    if (!PRIORITIES.includes(body.priority)) return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    if (body.priority !== existing.priority) { data.priority = body.priority; contentChanged = true; }
  }
  if ("eventDate" in body) {
    const parsed = parseEventDate(body.eventDate);
    if (!parsed.ok) return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    if ((parsed.date?.getTime() ?? null) !== (existing.eventDate?.getTime() ?? null)) {
      data.eventDate = parsed.date;
      contentChanged = true;
    }
  }
  if (typeof body.isPinned === "boolean" && body.isPinned !== existing.isPinned) data.isPinned = body.isPinned;
  if (contentChanged) data.editedAt = new Date();

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, edited: false });

  await prisma.announcement.updateMany({ where: { id, workspaceId: access.workspaceId }, data });
  if (contentChanged) await audit(access.workspaceId, access.userId, "ANNOUNCEMENT_EDIT", id, { title: data.title ?? existing.title });
  return NextResponse.json({ ok: true, edited: contentChanged });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const result = await getAccess(params);
  if (!result.ok) return result.response;
  const { access } = result;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const existing = await prisma.announcement.findFirst({
    where: { id, workspaceId: access.workspaceId },
    select: { authorId: true, title: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!canEditItem(access, existing.authorId)) {
    return NextResponse.json({ error: "You can only delete your own announcements." }, { status: 403 });
  }

  await prisma.announcement.deleteMany({ where: { id, workspaceId: access.workspaceId } });
  await audit(access.workspaceId, access.userId, "ANNOUNCEMENT_DELETE", id, { title: existing.title });
  return NextResponse.json({ ok: true });
}