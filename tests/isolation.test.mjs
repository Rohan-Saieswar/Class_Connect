import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const ALLOWED_EMAIL_DOMAIN = "@srmap.edu.in";
function validateSrmEmail(email) {
  if (!email || typeof email !== "string") return false;
  const cleanEmail = email.trim().toLowerCase();
  return cleanEmail.endsWith(ALLOWED_EMAIL_DOMAIN) && cleanEmail.length > ALLOWED_EMAIL_DOMAIN.length;
}

const prisma = new PrismaClient();

async function findUserInsensitive(email) {
  const matches = await prisma.$queryRaw`SELECT "id" FROM "User" WHERE LOWER("email") = LOWER(${email}) LIMIT 1`;
  return matches[0] ? prisma.user.findUnique({ where: { id: matches[0].id } }) : null;
}

test("Multi-Tenant Isolation & Security Suite", async (t) => {
  let userJStudent;
  let userJCR;
  let userGStudent;
  let userGCR;
  let workspaceJ;
  let workspaceG;

  await t.test("Setup: fetch seeded tenants and members", async () => {
    workspaceJ = await prisma.workspace.findFirst({ where: { section: "J" } });
    workspaceG = await prisma.workspace.findFirst({ where: { section: "G" } });

    assert.ok(workspaceJ, "Workspace J-Connect must exist");
    assert.ok(workspaceG, "Workspace G-Connect must exist");
    assert.equal(workspaceJ.generatedName, "J-Connect");
    assert.equal(workspaceG.generatedName, "G-Connect");

    userJStudent = await findUserInsensitive("rohan.s@srmap.edu.in");
    userJCR = await findUserInsensitive(process.env.INITIAL_CR_EMAIL_1);
    userGStudent = await prisma.user.findUnique({ where: { email: "bhavya.k@srmap.edu.in" } });
    userGCR = await prisma.user.findUnique({ where: { email: "cr1_section_g@srmap.edu.in" } });

    assert.ok(userJStudent);
    assert.ok(userJCR);
    assert.ok(userGStudent);
    assert.ok(userGCR);
  });

  await t.test("Authentication: Strict @srmap.edu.in domain enforcement", () => {
    // Valid SRM AP emails
    assert.equal(validateSrmEmail("student@srmap.edu.in"), true);
    assert.equal(validateSrmEmail("cr1_section_j@srmap.edu.in"), true);
    assert.equal(validateSrmEmail("dean.academics@srmap.edu.in"), true);

    // Rejected non-SRM AP emails
    assert.equal(validateSrmEmail("hacker@gmail.com"), false);
    assert.equal(validateSrmEmail("attacker@outlook.com"), false);
    assert.equal(validateSrmEmail("student@srmuniv.ac.in"), false);
    assert.equal(validateSrmEmail("user@yahoo.co.in"), false);
    assert.equal(validateSrmEmail(""), false);
    assert.equal(validateSrmEmail("srmap.edu.in"), false);
  });

  await t.test("Tenant Isolation: J member has membership in J, but NOT in G", async () => {
    const memJ = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: userJStudent.id, workspaceId: workspaceJ.id } },
    });
    assert.ok(memJ, "Student Rohan must have membership in J-Connect");
    assert.equal(memJ.role, "STUDENT");

    const memG = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: userJStudent.id, workspaceId: workspaceG.id } },
    });
    assert.equal(memG, null, "Section J Student must NOT have membership in Section G");
  });

  await t.test("Tenant Isolation: G member has membership in G, but NOT in J", async () => {
    const memG = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: userGStudent.id, workspaceId: workspaceG.id } },
    });
    assert.ok(memG, "Student Bhavya must have membership in G-Connect");

    const memJ = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: userGStudent.id, workspaceId: workspaceJ.id } },
    });
    assert.equal(memJ, null, "Section G Student must NOT have membership in Section J");
  });

  await t.test("CR Isolation: J CR is CR in J, but has zero role/membership in G", async () => {
    const jCrInJ = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: userJCR.id, workspaceId: workspaceJ.id } },
    });
    assert.equal(jCrInJ?.role, "CR");

    const jCrInG = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: userJCR.id, workspaceId: workspaceG.id } },
    });
    assert.equal(jCrInG, null, "Section J CR must NOT have membership or CR role in Section G");
  });

  await t.test("Initial J CRs come from environment and are unique, approved memberships", async () => {
    const expectedEmails = [process.env.INITIAL_CR_EMAIL_1, process.env.INITIAL_CR_EMAIL_2].map((email) => email.toLowerCase()).sort();
    const memberships = await prisma.workspaceMembership.findMany({
      where: { workspaceId: workspaceJ.id, role: "CR", status: "APPROVED" },
      include: { user: { select: { email: true } } },
    });
    assert.equal(memberships.length, 2);
    assert.deepEqual(memberships.map((membership) => membership.user.email.toLowerCase()).sort(), expectedEmails);
  });

  await t.test("CR Isolation: G CR is CR in G, but has zero role/membership in J", async () => {
    const gCrInG = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: userGCR.id, workspaceId: workspaceG.id } },
    });
    assert.equal(gCrInG?.role, "CR");

    const gCrInJ = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: userGCR.id, workspaceId: workspaceJ.id } },
    });
    assert.equal(gCrInJ, null, "Section G CR must NOT have membership or CR role in Section J");
  });

  await t.test("Data Isolation: Section J announcements are isolated from Section G", async () => {
    const jAnnouncements = await prisma.announcement.findMany({
      where: { workspaceId: workspaceJ.id },
    });
    const gAnnouncements = await prisma.announcement.findMany({
      where: { workspaceId: workspaceG.id },
    });

    assert.ok(jAnnouncements.length > 0, "J must have announcements");
    assert.ok(gAnnouncements.length > 0, "G must have announcements");

    // Verify no cross-contamination
    const jIds = new Set(jAnnouncements.map((a) => a.id));
    for (const gAnn of gAnnouncements) {
      assert.equal(jIds.has(gAnn.id), false, "Section G announcement must NOT appear in Section J dataset");
      assert.equal(gAnn.workspaceId, workspaceG.id);
    }
  });

  await t.test("Data Isolation: Section J requests are isolated from Section G", async () => {
    const jRequests = await prisma.request.findMany({
      where: { workspaceId: workspaceJ.id },
    });
    const gRequests = await prisma.request.findMany({
      where: { workspaceId: workspaceG.id },
    });

    assert.ok(jRequests.length > 0, "J must have student requests");
    assert.equal(gRequests.length, 0, "G has 0 requests initially");

    for (const req of jRequests) {
      assert.equal(req.workspaceId, workspaceJ.id, "All J requests must belong strictly to Workspace J");
    }
  });

  t.after(async () => {
    await prisma.$disconnect();
  });
});
