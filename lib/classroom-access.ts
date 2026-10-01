import "server-only";
import { prisma } from "@/lib/prisma";
import { authorizeWorkspace } from "@/lib/rbac";

export async function getClassroomContext(workspaceIdentifier: string) {
  const auth = await authorizeWorkspace(workspaceIdentifier, "VIEW_WORKSPACE");
  if (!auth.authorized) {
    return {
      ok: false as const,
      status: auth.error === "Authentication required" ? 401 : 403,
      error: auth.error ?? "Workspace access denied.",
    };
  }

  if (!auth.membership || auth.membership.status !== "APPROVED") {
    return { ok: false as const, status: 403, error: "Approved workspace membership is required." };
  }
  if (auth.workspace.status !== "ACTIVE") {
    return { ok: false as const, status: 403, error: "This workspace is not active." };
  }

  const connection = await prisma.googleClassroomUserConnection.findUnique({
    where: { userId_workspaceId: { userId: auth.user.id, workspaceId: auth.workspace.id } },
  });
  return {
    ok: true as const,
    user: auth.user,
    membership: auth.membership,
    workspace: auth.workspace,
    connection,
  };
}
