import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const optionalUrl = z.string().trim().max(300).refine((value) => {
  if (value === "") return true;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}, "Enter a valid HTTP or HTTPS URL.");
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(280),
  skills: z.string().trim().max(500),
  interests: z.string().trim().max(500),
  github: optionalUrl,
  linkedin: optionalUrl,
  portfolio: optionalUrl,
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Profile details could not be read." }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your profile details." }, { status: 400 });
  }

  const { name, ...profile } = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    const account = await tx.user.update({ where: { id: user.id }, data: { name }, select: { name: true } });
    if (user.studentProfile) {
      await tx.studentProfile.update({ where: { userId: user.id }, data: profile });
    } else if (user.facultyProfile) {
      await tx.facultyProfile.update({ where: { userId: user.id }, data: { researchAreas: profile.interests } });
    }
    return account;
  });

  return NextResponse.json({ ok: true, name: updated.name, profile });
}