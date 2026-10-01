import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeWorkspace } from "@/lib/rbac";
import { hashPassword, validateSrmEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const approvalSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(2).max(80),
  role: z.enum(["STUDENT", "FACULTY"]),
});

async function findUserByEmailInsensitive(email: string) {
  const matches = await prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "User" WHERE LOWER("email") = LOWER(${email}) LIMIT 1`;
  if (!matches[0]) return null;
  return prisma.user.findUnique({ where: { id: matches[0].id } });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspace: string }> },
) {
  const { workspace: workspaceSection } = await params;
  const auth = await authorizeWorkspace(workspaceSection, "APPROVE_MEMBERS");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error ?? "Not authorized." }, { status: auth.user ? 403 : 401 });
  }
  if (auth.workspace.status !== "ACTIVE") {
    return NextResponse.json({ error: "Archived or suspended workspaces cannot add members." }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide a valid JSON membership request." }, { status: 400 });
  }

  const parsed = approvalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the membership details." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  if (!validateSrmEmail(email)) {
    return NextResponse.json({ error: "Only @srmap.edu.in accounts can be approved." }, { status: 400 });
  }

  try {
    let user = await findUserByEmailInsensitive(email);
    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            email,
            name: parsed.data.name,
            passwordHash: hashPassword(crypto.randomBytes(32).toString("base64url")),
            isVerified: false,
            userPreference: { create: { language: "en", theme: "system" } },
          },
        });
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") throw error;
        user = await findUserByEmailInsensitive(email);
        if (!user) throw error;
      }
    }

    const existing = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId: auth.workspace.id } },
    });
    if (existing?.role === "CR") {
      return NextResponse.json({ error: "A CR membership cannot be changed through this approval action." }, { status: 409 });
    }

    const membership = await prisma.workspaceMembership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: auth.workspace.id } },
      create: {
        userId: user.id,
        workspaceId: auth.workspace.id,
        role: parsed.data.role,
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: auth.user.id,
      },
      update: {
        role: parsed.data.role,
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: auth.user.id,
      },
    });

    return NextResponse.json({
      ok: true,
      email: user.email,
      role: membership.role,
      status: membership.status,
      workspace: auth.workspace.displayName,
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
    if (process.env.NODE_ENV === "development") console.error("[MEMBERSHIP_APPROVAL_FAILED]", { code });
    return NextResponse.json({ error: "Membership could not be approved. Try again." }, { status: 500 });
  }
}
