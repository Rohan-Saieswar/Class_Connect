import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = user.memberships.find((item) =>
    item.status === "APPROVED" && item.workspace.status === "ACTIVE"
  );
  if (membership) redirect(`/${membership.workspace.section.toLowerCase()}`);

  if (user.globalRole === "SYSTEM_ADMIN") {
    const workspace = await prisma.workspace.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
    if (workspace) redirect(`/${workspace.section.toLowerCase()}`);
  }

  redirect("/login");
}
