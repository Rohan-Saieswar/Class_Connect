import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";

export type WorkspaceRole = "STUDENT" | "CR" | "FACULTY" | "MODERATOR" | "SYSTEM_ADMIN";

export type WorkspaceAction =
  | "VIEW_WORKSPACE"
  | "CREATE_POST"
  | "DELETE_POST"
  | "PIN_POST"
  | "CREATE_ANNOUNCEMENT"
  | "MANAGE_ANNOUNCEMENTS"
  | "SUBMIT_REQUEST"
  | "MANAGE_REQUESTS"
  | "CREATE_POLL"
  | "VOTE_POLL"
  | "UPLOAD_RESOURCE"
  | "MANAGE_RESOURCES"
  | "MANAGE_TIMETABLE"
  | "MANAGE_EXAMS"
  | "APPROVE_MEMBERS"
  | "IMPORT_STUDENTS"
  | "APPROVE_FACULTY"
  | "VIEW_AUDIT_LOGS"
  | "MANAGE_SETTINGS"
  | "MODERATE_CONTENT";

const ROLE_PERMISSIONS: Record<WorkspaceRole, WorkspaceAction[]> = {
  STUDENT: [
    "VIEW_WORKSPACE",
    "CREATE_POST",
    "SUBMIT_REQUEST",
    "VOTE_POLL",
    "UPLOAD_RESOURCE",
  ],
  FACULTY: [
    "VIEW_WORKSPACE",
    "CREATE_POST",
    "CREATE_ANNOUNCEMENT",
    "CREATE_POLL",
    "VOTE_POLL",
    "UPLOAD_RESOURCE",
    "MANAGE_RESOURCES",
    "MANAGE_EXAMS",
  ],
  MODERATOR: [
    "VIEW_WORKSPACE",
    "CREATE_POST",
    "DELETE_POST",
    "PIN_POST",
    "CREATE_ANNOUNCEMENT",
    "CREATE_POLL",
    "VOTE_POLL",
    "UPLOAD_RESOURCE",
    "MODERATE_CONTENT",
  ],
  CR: [
    "VIEW_WORKSPACE",
    "CREATE_POST",
    "DELETE_POST",
    "PIN_POST",
    "CREATE_ANNOUNCEMENT",
    "MANAGE_ANNOUNCEMENTS",
    "SUBMIT_REQUEST",
    "MANAGE_REQUESTS",
    "CREATE_POLL",
    "VOTE_POLL",
    "UPLOAD_RESOURCE",
    "MANAGE_RESOURCES",
    "MANAGE_TIMETABLE",
    "MANAGE_EXAMS",
    "APPROVE_MEMBERS",
    "IMPORT_STUDENTS",
    "APPROVE_FACULTY",
    "VIEW_AUDIT_LOGS",
    "MANAGE_SETTINGS",
    "MODERATE_CONTENT",
  ],
  SYSTEM_ADMIN: [
    "VIEW_WORKSPACE",
    "CREATE_POST",
    "DELETE_POST",
    "PIN_POST",
    "CREATE_ANNOUNCEMENT",
    "MANAGE_ANNOUNCEMENTS",
    "SUBMIT_REQUEST",
    "MANAGE_REQUESTS",
    "CREATE_POLL",
    "VOTE_POLL",
    "UPLOAD_RESOURCE",
    "MANAGE_RESOURCES",
    "MANAGE_TIMETABLE",
    "MANAGE_EXAMS",
    "APPROVE_MEMBERS",
    "IMPORT_STUDENTS",
    "APPROVE_FACULTY",
    "VIEW_AUDIT_LOGS",
    "MANAGE_SETTINGS",
    "MODERATE_CONTENT",
  ],
};

/**
 * Resolves a workspace by its ID or Section identifier (e.g. "j", "g", "k" or CUID)
 */
export async function resolveWorkspace(identifier: string) {
  if (!identifier) return null;
  const clean = identifier.trim();

  // Try finding by ID first
  let workspace = await prisma.workspace.findUnique({
    where: { id: clean },
  });

  // If not found, try matching by section case-insensitively
  if (!workspace) {
    const upperSection = clean.toUpperCase();
    workspace = await prisma.workspace.findFirst({
      where: {
        section: upperSection,
        status: { in: ["ACTIVE", "ARCHIVED"] },
      },
    });
  }

  return workspace;
}

export interface AuthContext {
  authorized: boolean;
  user: any;
  workspace: any;
  membership: any;
  role: WorkspaceRole;
  isCR: boolean;
  isFaculty: boolean;
  isSystemAdmin: boolean;
  error?: string;
}

/**
 * MANDATORY SERVER-SIDE AUTHORIZATION:
 * Validates session, resolves workspace, verifies user's membership in that specific workspace,
 * and confirms the user has permissions.
 */
export async function authorizeWorkspace(
  workspaceIdentifier: string,
  requiredAction?: WorkspaceAction
): Promise<AuthContext> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      authorized: false,
      user: null,
      workspace: null,
      membership: null,
      role: "STUDENT",
      isCR: false,
      isFaculty: false,
      isSystemAdmin: false,
      error: "Authentication required",
    };
  }

  const workspace = await resolveWorkspace(workspaceIdentifier);
  if (!workspace) {
    return {
      authorized: false,
      user,
      workspace: null,
      membership: null,
      role: "STUDENT",
      isCR: false,
      isFaculty: false,
      isSystemAdmin: false,
      error: "Workspace not found",
    };
  }

  const isSystemAdmin = user.globalRole === "SYSTEM_ADMIN";

  // Check workspace-specific membership
  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
  });

  // If not a member and not system admin, deny access
  if (!membership && !isSystemAdmin) {
    return {
      authorized: false,
      user,
      workspace,
      membership: null,
      role: "STUDENT",
      isCR: false,
      isFaculty: false,
      isSystemAdmin: false,
      error: "Access denied: You are not a member of this class workspace",
    };
  }

  const role: WorkspaceRole = isSystemAdmin
    ? "SYSTEM_ADMIN"
    : ((membership?.role as WorkspaceRole) || "STUDENT");

  // Check specific action permissions
  if (requiredAction) {
    const allowedActions = ROLE_PERMISSIONS[role] || [];
    if (!allowedActions.includes(requiredAction)) {
      return {
        authorized: false,
        user,
        workspace,
        membership,
        role,
        isCR: role === "CR",
        isFaculty: role === "FACULTY",
        isSystemAdmin,
        error: `Forbidden: Role ${role} cannot perform action ${requiredAction}`,
      };
    }
  }

  return {
    authorized: true,
    user,
    workspace,
    membership,
    role,
    isCR: role === "CR" || isSystemAdmin,
    isFaculty: role === "FACULTY",
    isSystemAdmin,
  };
}
