import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorkspaceBranding } from "@/lib/branding";
import { prisma } from "@/lib/prisma";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ workspace: string }> }): Promise<Metadata> {
  const { workspace } = await params;
  const record = await prisma.workspace.findFirst({
    where: { section: workspace.toUpperCase(), status: "ACTIVE" },
  });
  if (!record) return { title: "Class workspace not found | Section-Connect" };
  const branding = getWorkspaceBranding(record);
  return {
    title: branding.fullTitle,
    description: `${branding.displayName} - ${branding.subheading}`,
  };
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const { workspace } = await params;
  const record = await prisma.workspace.findFirst({
    where: { section: workspace.toUpperCase(), status: "ACTIVE" },
    select: { section: true, accentColor: true },
  });
  if (!record) notFound();
  const branding = getWorkspaceBranding(record);

  return (
    <div
      style={{ "--brand-color": branding.accentColor, "--brand-glow": branding.accentColor + "40" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
