import { prisma } from "./prisma";

export interface LogAuditOptions {
  workspaceId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(options: LogAuditOptions) {
  try {
    return await prisma.auditLog.create({
      data: {
        workspaceId: options.workspaceId,
        actorId: options.actorId,
        action: options.action,
        targetType: options.targetType,
        targetId: options.targetId,
        previousStateJson: options.previousState ? JSON.stringify(options.previousState) : null,
        newStateJson: options.newState ? JSON.stringify(options.newState) : null,
        ipAddress: options.ipAddress || "127.0.0.1",
        userAgent: options.userAgent || "Section-Connect Web Client",
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}
