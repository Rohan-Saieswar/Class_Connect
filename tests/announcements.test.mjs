import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

const POST_ROLES = new Set(["CR", "FACULTY", "MODERATOR", "SYSTEM_ADMIN"]);
const MANAGE_ROLES = new Set(["CR", "MODERATOR", "SYSTEM_ADMIN"]);

async function findUserInsensitive(email) {
  const matches = await prisma.$queryRaw`SELECT "id" FROM "User" WHERE LOWER("email") = LOWER(${email}) LIMIT 1`;
  return matches[0] ? prisma.user.findUnique({ where: { id: matches[0].id } }) : null;
}

async function checkWorkspaceAccess(userId, workspaceSection) {
  const workspace = await prisma.workspace.findFirst({
    where: { section: workspaceSection.toUpperCase(), status: "ACTIVE" },
  });
  if (!workspace) {
    return { ok: false, status: 404, error: "Workspace not found" };
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: workspace.id } },
  });

  if (!membership || membership.status !== "APPROVED") {
    return { ok: false, status: 403, error: "Approved workspace membership is required." };
  }

  return { ok: true, status: 200, workspace, membership };
}

function evaluateAnnouncementAction(membership, action, announcement, currentUserId) {
  if (!membership || membership.status !== "APPROVED") {
    return { allowed: false, status: 403 };
  }

  if (action === "GET") {
    return { allowed: true, status: 200 };
  }

  if (action === "POST" || action === "PATCH") {
    if (!POST_ROLES.has(membership.role)) {
      return { allowed: false, status: 403 };
    }
    return { allowed: true, status: 200 };
  }

  if (action === "DELETE") {
    if (!POST_ROLES.has(membership.role)) {
      return { allowed: false, status: 403 };
    }
    if (membership.role === "FACULTY" && announcement && announcement.authorId !== currentUserId) {
      return { allowed: false, status: 403 };
    }
    return { allowed: true, status: 200 };
  }

  return { allowed: false, status: 400 };
}

test("Announcements RBAC & Multi-Tenant Isolation Suite", async (t) => {
  let workspaceJ;
  let workspaceG;
  let userJStudent;
  let userJCR;
  let userGStudent;
  let userGCR;
  let createdAnnouncementIds = [];

  await t.test("Setup: fetch seeded tenants and users", async () => {
    workspaceJ = await prisma.workspace.findFirst({ where: { section: "J" } });
    workspaceG = await prisma.workspace.findFirst({ where: { section: "G" } });

    assert.ok(workspaceJ, "Workspace J must exist");
    assert.ok(workspaceG, "Workspace G must exist");

    userJStudent = await findUserInsensitive("rohan.s@srmap.edu.in");
    userJCR = await findUserInsensitive(process.env.INITIAL_CR_EMAIL_1);
    userGStudent = await prisma.user.findUnique({ where: { email: "bhavya.k@srmap.edu.in" } });
    userGCR = await prisma.user.findUnique({ where: { email: "cr1_section_g@srmap.edu.in" } });

    assert.ok(userJStudent, "Student Rohan in J must exist");
    assert.ok(userJCR, "CR in J must exist");
    assert.ok(userGStudent, "Student Bhavya in G must exist");
    assert.ok(userGCR, "CR in G must exist");
  });

  await t.test("a STUDENT cannot POST, PATCH or DELETE (403)", async () => {
    const access = await checkWorkspaceAccess(userJStudent.id, "J");
    assert.equal(access.ok, true);
    assert.equal(access.membership.role, "STUDENT");

    const dummyAnnouncement = { id: "test-ann-1", authorId: userJCR.id, workspaceId: workspaceJ.id };

    const postPerm = evaluateAnnouncementAction(access.membership, "POST");
    assert.equal(postPerm.allowed, false);
    assert.equal(postPerm.status, 403);

    const patchPerm = evaluateAnnouncementAction(access.membership, "PATCH");
    assert.equal(patchPerm.allowed, false);
    assert.equal(patchPerm.status, 403);

    const deletePerm = evaluateAnnouncementAction(access.membership, "DELETE", dummyAnnouncement, userJStudent.id);
    assert.equal(deletePerm.allowed, false);
    assert.equal(deletePerm.status, 403);
  });

  await t.test("a user from another workspace cannot read, edit or delete this workspace's announcements", async () => {
    // Bhavya (G student) accessing Section J
    const gStudentInJ = await checkWorkspaceAccess(userGStudent.id, "J");
    assert.equal(gStudentInJ.ok, false);
    assert.equal(gStudentInJ.status, 403);

    // G CR accessing Section J
    const gCRInJ = await checkWorkspaceAccess(userGCR.id, "J");
    assert.equal(gCRInJ.ok, false);
    assert.equal(gCRInJ.status, 403);

    // Create a Section J announcement to verify database multi-tenant isolation
    const jAnnouncement = await prisma.announcement.create({
      data: {
        workspaceId: workspaceJ.id,
        authorId: userJCR.id,
        title: "Confidential Section J Announcement",
        content: "Only Section J students should see this.",
        category: "ACADEMIC",
        priority: "HIGH",
        status: "PUBLISHED",
        isPinned: false,
      },
    });
    createdAnnouncementIds.push(jAnnouncement.id);

    // Section G query MUST NOT find Section J announcements
    const gView = await prisma.announcement.findMany({
      where: {
        workspaceId: workspaceG.id,
        id: jAnnouncement.id,
      },
    });
    assert.equal(gView.length, 0, "Section G query must never find Section J announcements");

    // Section G update scoped by workspaceId MUST NOT affect Section J announcement
    const updateResult = await prisma.announcement.updateMany({
      where: {
        id: jAnnouncement.id,
        workspaceId: workspaceG.id,
      },
      data: { isPinned: true },
    });
    assert.equal(updateResult.count, 0, "Cross-workspace update must affect 0 rows");

    // Section G delete scoped by workspaceId MUST NOT delete Section J announcement
    const deleteResult = await prisma.announcement.deleteMany({
      where: {
        id: jAnnouncement.id,
        workspaceId: workspaceG.id,
      },
    });
    assert.equal(deleteResult.count, 0, "Cross-workspace delete must affect 0 rows");

    // Verify Section J announcement remains untouched
    const verified = await prisma.announcement.findUnique({
      where: { id: jAnnouncement.id },
    });
    assert.ok(verified);
    assert.equal(verified.isPinned, false);
  });

  await t.test("a PENDING member gets 403", async () => {
    const testEmail = `pending_test_${Date.now()}@srmap.edu.in`;
    const pendingUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Pending Student",
        passwordHash: "test_hash",
      },
    });

    const pendingMembership = await prisma.workspaceMembership.create({
      data: {
        userId: pendingUser.id,
        workspaceId: workspaceJ.id,
        role: "STUDENT",
        status: "PENDING",
      },
    });

    try {
      const access = await checkWorkspaceAccess(pendingUser.id, "J");
      assert.equal(access.ok, false);
      assert.equal(access.status, 403);
      assert.equal(access.error, "Approved workspace membership is required.");

      const postPerm = evaluateAnnouncementAction(pendingMembership, "POST");
      assert.equal(postPerm.allowed, false);
      assert.equal(postPerm.status, 403);

      const getPerm = evaluateAnnouncementAction(pendingMembership, "GET");
      assert.equal(getPerm.allowed, false);
      assert.equal(getPerm.status, 403);
    } finally {
      await prisma.workspaceMembership.delete({ where: { id: pendingMembership.id } });
      await prisma.user.delete({ where: { id: pendingUser.id } });
    }
  });

  await t.test("an expired or non-PUBLISHED announcement is not returned by GET", async () => {
    const now = new Date();
    const pastOneHour = new Date(now.getTime() - 3600 * 1000);
    const pastTwoHours = new Date(now.getTime() - 7200 * 1000);
    const futureOneHour = new Date(now.getTime() + 3600 * 1000);

    // 1. Valid active published announcement
    const valid = await prisma.announcement.create({
      data: {
        workspaceId: workspaceJ.id,
        authorId: userJCR.id,
        title: "Active Published Announcement",
        content: "Active announcement content",
        status: "PUBLISHED",
        publishedAt: pastOneHour,
        expiresAt: null,
      },
    });
    createdAnnouncementIds.push(valid.id);

    // 2. Expired announcement (expiresAt in the past)
    const expired = await prisma.announcement.create({
      data: {
        workspaceId: workspaceJ.id,
        authorId: userJCR.id,
        title: "Expired Announcement",
        content: "Expired announcement content",
        status: "PUBLISHED",
        publishedAt: pastTwoHours,
        expiresAt: pastOneHour,
      },
    });
    createdAnnouncementIds.push(expired.id);

    // 3. Draft announcement
    const draft = await prisma.announcement.create({
      data: {
        workspaceId: workspaceJ.id,
        authorId: userJCR.id,
        title: "Draft Announcement",
        content: "Draft announcement content",
        status: "DRAFT",
        publishedAt: pastOneHour,
        expiresAt: null,
      },
    });
    createdAnnouncementIds.push(draft.id);

    // 4. Future scheduled announcement (publishedAt in the future)
    const future = await prisma.announcement.create({
      data: {
        workspaceId: workspaceJ.id,
        authorId: userJCR.id,
        title: "Future Announcement",
        content: "Future announcement content",
        status: "PUBLISHED",
        publishedAt: futureOneHour,
        expiresAt: null,
      },
    });
    createdAnnouncementIds.push(future.id);

    // 5. Archived announcement
    const archived = await prisma.announcement.create({
      data: {
        workspaceId: workspaceJ.id,
        authorId: userJCR.id,
        title: "Archived Announcement",
        content: "Archived announcement content",
        status: "ARCHIVED",
        publishedAt: pastOneHour,
        expiresAt: null,
      },
    });
    createdAnnouncementIds.push(archived.id);

    // Run the GET query exactly as implemented in app/api/[workspace]/announcements/route.ts
    const currentTime = new Date();
    const fetched = await prisma.announcement.findMany({
      where: {
        workspaceId: workspaceJ.id,
        status: "PUBLISHED",
        publishedAt: { lte: currentTime },
        OR: [{ expiresAt: null }, { expiresAt: { gt: currentTime } }],
      },
    });

    const fetchedIds = new Set(fetched.map((a) => a.id));

    assert.ok(fetchedIds.has(valid.id), "Active published announcement MUST be returned");
    assert.equal(fetchedIds.has(expired.id), false, "Expired announcement MUST NOT be returned");
    assert.equal(fetchedIds.has(draft.id), false, "Draft announcement MUST NOT be returned");
    assert.equal(fetchedIds.has(future.id), false, "Future publishedAt announcement MUST NOT be returned");
    assert.equal(fetchedIds.has(archived.id), false, "Archived announcement MUST NOT be returned");
  });

  t.after(async () => {
    for (const id of createdAnnouncementIds) {
      await prisma.announcement.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });
});
