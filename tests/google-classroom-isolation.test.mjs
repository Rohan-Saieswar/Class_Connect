import test from "node:test";
import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

nextEnv.loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

async function findUserInsensitive(email) {
  const matches = await prisma.$queryRaw`SELECT "id" FROM "User" WHERE LOWER("email") = LOWER(${email}) LIMIT 1`;
  return matches[0] ? prisma.user.findUnique({ where: { id: matches[0].id } }) : null;
}

test("Google Classroom cache is personal and workspace-scoped", async (t) => {
  let connectionA;
  let connectionB;
  try {
    const workspace = await prisma.workspace.findFirst({ where: { section: "J", academicYear: "2026–27" } });
    assert.ok(workspace, "J-Connect workspace must be seeded");

    const userA = await findUserInsensitive(process.env.INITIAL_CR_EMAIL_1);
    const userB = await findUserInsensitive(process.env.INITIAL_CR_EMAIL_2);
    assert.ok(userA && userB && userA.id !== userB.id, "two distinct configured users must exist");

    await t.test("each user resolves only their own workspace connection", async () => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      connectionA = await prisma.googleClassroomUserConnection.create({
        data: {
          userId: userA.id,
          workspaceId: workspace.id,
          googleSubjectId: `test-user-a-${suffix}`,
          googleEmail: "test-account-a@example.invalid",
          status: "CONNECTED",
          grantedScopesJson: "[]",
        },
      });
      connectionB = await prisma.googleClassroomUserConnection.create({
        data: {
          userId: userB.id,
          workspaceId: workspace.id,
          googleSubjectId: `test-user-b-${suffix}`,
          googleEmail: "test-account-b@example.invalid",
          status: "CONNECTED",
          grantedScopesJson: "[]",
        },
      });

      const resolvedA = await prisma.googleClassroomUserConnection.findUnique({
        where: { userId_workspaceId: { userId: userA.id, workspaceId: workspace.id } },
      });
      const resolvedB = await prisma.googleClassroomUserConnection.findUnique({
        where: { userId_workspaceId: { userId: userB.id, workspaceId: workspace.id } },
      });
      assert.equal(resolvedA?.id, connectionA.id);
      assert.equal(resolvedB?.id, connectionB.id);
      assert.notEqual(resolvedA?.id, resolvedB?.id);
    });

    await t.test("submissions and grades stay with their owning account", async () => {
      const courseA = await prisma.googleClassroomCourse.create({
        data: { connectionId: connectionA.id, userId: userA.id, workspaceId: workspace.id, googleCourseId: `course-a-${connectionA.id}`, name: "Private course A" },
      });
      const courseB = await prisma.googleClassroomCourse.create({
        data: { connectionId: connectionB.id, userId: userB.id, workspaceId: workspace.id, googleCourseId: `course-b-${connectionB.id}`, name: "Private course B" },
      });
      const workA = await prisma.googleClassroomCoursework.create({
        data: { connectionId: connectionA.id, courseId: courseA.id, userId: userA.id, workspaceId: workspace.id, googleCourseworkId: `work-a-${connectionA.id}`, title: "A assignment" },
      });
      const workB = await prisma.googleClassroomCoursework.create({
        data: { connectionId: connectionB.id, courseId: courseB.id, userId: userB.id, workspaceId: workspace.id, googleCourseworkId: `work-b-${connectionB.id}`, title: "B assignment" },
      });
      await prisma.googleClassroomSubmission.create({
        data: { connectionId: connectionA.id, courseworkId: workA.id, userId: userA.id, workspaceId: workspace.id, googleSubmissionId: `submission-a-${connectionA.id}`, state: "TURNED_IN", assignedGrade: 8 },
      });
      await prisma.googleClassroomSubmission.create({
        data: { connectionId: connectionB.id, courseworkId: workB.id, userId: userB.id, workspaceId: workspace.id, googleSubmissionId: `submission-b-${connectionB.id}`, state: "RETURNED", assignedGrade: 10 },
      });

      const submissionsA = await prisma.googleClassroomSubmission.findMany({
        where: { connectionId: connectionA.id, userId: userA.id, workspaceId: workspace.id },
        include: { coursework: true },
      });
      assert.equal(submissionsA.length, 1);
      assert.equal(submissionsA[0].coursework.title, "A assignment");
      assert.equal(submissionsA[0].assignedGrade, 8);
      assert.notEqual(submissionsA[0].connectionId, connectionB.id);
    });

    await t.test("disconnected connections are not eligible for live sync", async () => {
      await prisma.googleClassroomUserConnection.update({ where: { id: connectionA.id }, data: { status: "DISCONNECTED" } });
      const liveConnection = await prisma.googleClassroomUserConnection.findFirst({
        where: { id: connectionA.id, userId: userA.id, workspaceId: workspace.id, status: "CONNECTED" },
      });
      assert.equal(liveConnection, null);
    });
  } finally {
    if (connectionA) await prisma.googleClassroomUserConnection.delete({ where: { id: connectionA.id } }).catch(() => undefined);
    if (connectionB) await prisma.googleClassroomUserConnection.delete({ where: { id: connectionB.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
});
