import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceBranding } from "@/lib/branding";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/layout/DashboardShell";
import AccessNotice from "@/components/auth/AccessNotice";

interface WorkspacePageProps {
  params: Promise<{ workspace: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspace } = await params;
  const section = workspace.toUpperCase();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/${workspace.toLowerCase()}`);

  const currentWorkspace = await prisma.workspace.findFirst({ where: { section, status: "ACTIVE" } });
  if (!currentWorkspace) notFound();

  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: currentWorkspace.id } },
  });
  const isSystemAdmin = user.globalRole === "SYSTEM_ADMIN";
  if ((!membership || membership.status !== "APPROVED") && !isSystemAdmin) {
    return <AccessNotice section={section} />;
  }

  const branding = getWorkspaceBranding(currentWorkspace);
  const profile = {
    name: user.name,
    email: user.email,
    role: isSystemAdmin ? "SYSTEM_ADMIN" : membership?.role ?? "STUDENT",
    bio: user.studentProfile?.bio ?? "",
    skills: user.studentProfile?.skills ?? "",
    interests: user.studentProfile?.interests ?? user.facultyProfile?.researchAreas ?? "",
    github: user.studentProfile?.github ?? "",
    linkedin: user.studentProfile?.linkedin ?? "",
    portfolio: user.studentProfile?.portfolio ?? "",
    isStudent: Boolean(user.studentProfile),
    memberships: user.memberships
      .filter((item) => item.status === "APPROVED" && item.workspace.status === "ACTIVE")
      .map((item) => ({ section: item.workspace.section, name: `${item.workspace.section}-Connect`, displayName: item.workspace.displayName, role: item.role })),
  };

  return <DashboardShell branding={branding} section={workspace.toLowerCase()} profile={profile} />;
}
