import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import AccessNotice from "@/components/auth/AccessNotice";
import ClassroomView from "@/components/workspace/ClassroomView";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ClassroomPageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ connection?: string }>;
}

export async function generateMetadata({ params }: Pick<ClassroomPageProps, "params">): Promise<Metadata> {
  const { workspace: section } = await params;
  const record = await prisma.workspace.findFirst({ where: { section: section.toUpperCase(), status: "ACTIVE" } });
  return { title: record ? `My Google Classroom | ${section.toUpperCase()}-Connect` : "Google Classroom | Section-Connect" };
}

export default async function ClassroomPage({ params, searchParams }: ClassroomPageProps) {
  const { workspace: rawSection } = await params;
  const section = rawSection.toUpperCase();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/class/${rawSection.toLowerCase()}/classroom`)}`);

  const workspace = await prisma.workspace.findFirst({ where: { section, status: "ACTIVE" } });
  if (!workspace) notFound();
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
  });
  if (!membership || membership.status !== "APPROVED") return <AccessNotice section={section} />;

  const { connection } = await searchParams;
  return <ClassroomView section={rawSection.toLowerCase()} workspaceName={`${section}-Connect`} displayName={workspace.displayName} connectionResult={connection} />;
}
