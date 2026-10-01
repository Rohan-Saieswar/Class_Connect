import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const UNIVERSITY_DOMAIN = "@srmap.edu.in";
const J_WORKSPACE = {
  universityId: "srmap",
  universityName: "SRM University–AP",
  department: "Computer Science and Engineering",
  program: "B.Tech",
  specialization: "Artificial Intelligence and Machine Learning",
  section: "J",
  displayName: "CSE AI & ML — Section J",
  generatedName: "J-Connect",
  academicYear: "2026–27",
  semester: 5,
  description: "Digital class workspace for B.Tech CSE AI & ML Section J.",
  accentColor: "#842343",
  status: "ACTIVE",
};
const G_WORKSPACE = {
  ...J_WORKSPACE,
  section: "G",
  displayName: "CSE AI & ML — Section G",
  generatedName: "G-Connect",
  description: "Isolated demo workspace for B.Tech CSE AI & ML Section G.",
};

const SUBJECTS = [
  { code: "CSE 301", name: "Artificial Intelligence & Neural Networks", credits: 4, color: "#842343", icon: "Brain" },
  { code: "CSE 302", name: "Deep Learning Architectures", credits: 4, color: "#10b981", icon: "Cpu" },
  { code: "CSE 303", name: "Cloud Virtualization & Distributed Systems", credits: 3, color: "#b99143", icon: "Cloud" },
  { code: "CSE 304", name: "Formal Languages & Automata Theory", credits: 4, color: "#247b83", icon: "Binary" },
];

const STUDENTS = [
  { name: "Riya Mehta", email: "demo.j.student1@srmap.edu.in", rollNumber: "AP26J0001", cgpa: 8.7, interests: "Machine learning, responsible AI" },
  { name: "Kabir Nair", email: "demo.j.student2@srmap.edu.in", rollNumber: "AP26J0002", cgpa: 8.4, interests: "Computer vision, robotics" },
  { name: "Anika Rao", email: "demo.j.student3@srmap.edu.in", rollNumber: "AP26J0003", cgpa: 9.1, interests: "Natural language processing" },
  { name: "Dev Shah", email: "demo.j.student4@srmap.edu.in", rollNumber: "AP26J0004", cgpa: 8.9, interests: "Distributed systems, cloud computing" },
  { name: "Rohan Saieswar", email: "rohan.s@srmap.edu.in", rollNumber: "AP23110010003", cgpa: 8.8, interests: "Algorithms, machine learning" },
];

const FACULTY = [
  { name: "Dr. Mira Sen", email: "demo.faculty.ai@srmap.edu.in", employeeId: "DEMO-CSE-J-01", designation: "Associate Professor", researchAreas: "Neural networks, explainable AI", code: "CSE 301" },
  { name: "Dr. Arjun Das", email: "demo.faculty.cloud@srmap.edu.in", employeeId: "DEMO-CSE-J-02", designation: "Assistant Professor", researchAreas: "Distributed systems, cloud platforms", code: "CSE 303" },
];

function normalizedEmail(email) {
  return email.trim().toLowerCase();
}

function isSrmEmail(email) {
  return email.length > UNIVERSITY_DOMAIN.length && email.endsWith(UNIVERSITY_DOMAIN);
}

async function findUserInsensitive(email) {
  const rows = await prisma.$queryRaw`SELECT "id" FROM "User" WHERE LOWER("email") = LOWER(${email}) LIMIT 1`;
  return rows[0] ? prisma.user.findUnique({ where: { id: rows[0].id } }) : null;
}

async function ensureUser({ email, name }) {
  const cleanEmail = normalizedEmail(email);
  let user = await findUserInsensitive(cleanEmail);
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name,
          passwordHash: `google-only:${crypto.randomBytes(32).toString("hex")}`,
          isVerified: false,
          userPreference: { create: { language: "en", theme: "system" } },
        },
      });
    } catch (error) {
      if (error?.code !== "P2002") throw error;
      user = await findUserInsensitive(cleanEmail);
      if (!user) throw error;
    }
  }

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, language: "en", theme: "system" },
    update: {},
  });
  return user;
}

async function setWorkspaceMembership(user, workspace, role) {
  return prisma.workspaceMembership.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role,
      status: "APPROVED",
      approvedAt: new Date(),
    },
    update: {
      role,
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });
}

async function ensureWorkspace(data) {
  return prisma.workspace.upsert({
    where: {
      department_program_specialization_section_academicYear: {
        department: data.department,
        program: data.program,
        specialization: data.specialization,
        section: data.section,
        academicYear: data.academicYear,
      },
    },
    create: data,
    update: {
      universityId: data.universityId,
      universityName: data.universityName,
      displayName: data.displayName,
      generatedName: `${data.section}-Connect`,
      semester: data.semester,
      description: data.description,
      accentColor: data.accentColor,
      status: "ACTIVE",
    },
  });
}

async function ensureWorkspaceSettings(workspace) {
  await prisma.workspaceSettings.upsert({
    where: { workspaceId: workspace.id },
    create: {
      workspaceId: workspace.id,
      allowStudentPosts: true,
      allowAnonymousFeedback: true,
      defaultTimetableSlots: 7,
      attendanceThreshold: 75,
    },
    update: {},
  });
}

async function main() {
  const initialCrEmails = [process.env.INITIAL_CR_EMAIL_1, process.env.INITIAL_CR_EMAIL_2]
    .map((email) => email?.trim())
    .filter(Boolean)
    .map(normalizedEmail);

  if (initialCrEmails.length !== 2 || initialCrEmails.some((email) => !isSrmEmail(email))) {
    throw new Error("Set INITIAL_CR_EMAIL_1 and INITIAL_CR_EMAIL_2 to two @srmap.edu.in addresses before seeding.");
  }
  if (new Set(initialCrEmails).size !== 2) {
    throw new Error("INITIAL_CR_EMAIL_1 and INITIAL_CR_EMAIL_2 must be different email addresses.");
  }

  const workspace = await ensureWorkspace(J_WORKSPACE);
  await ensureWorkspaceSettings(workspace);

  const subjects = new Map();
  for (const subject of SUBJECTS) {
    const saved = await prisma.subject.upsert({
      where: { workspaceId_code: { workspaceId: workspace.id, code: subject.code } },
      create: {
        workspaceId: workspace.id,
        ...subject,
        description: `${subject.name} for Section J, semester 5.`,
        semester: 5,
      },
      update: {
        name: subject.name,
        credits: subject.credits,
        color: subject.color,
        icon: subject.icon,
        semester: 5,
      },
    });
    subjects.set(subject.code, saved);
  }

  const crUsers = [];
  for (const [index, email] of initialCrEmails.entries()) {
    const localName = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    const user = await ensureUser({ email, name: localName || `J-Connect CR ${index + 1}` });
    await setWorkspaceMembership(user, workspace, "CR");
    crUsers.push(user);
  }

  const configuredCrs = new Set(initialCrEmails);
  const currentCrs = await prisma.workspaceMembership.findMany({
    where: { workspaceId: workspace.id, role: "CR" },
    include: { user: { select: { email: true } } },
  });
  for (const membership of currentCrs) {
    if (!configuredCrs.has(normalizedEmail(membership.user.email))) {
      await prisma.workspaceMembership.update({
        where: { id: membership.id },
        data: { role: "STUDENT" },
      });
    }
  }

  for (const student of STUDENTS) {
    const user = await ensureUser(student);
    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        rollNumber: student.rollNumber,
        currentSemester: 5,
        cgpa: student.cgpa,
        interests: student.interests,
      },
      update: {
        rollNumber: student.rollNumber,
        currentSemester: 5,
        cgpa: student.cgpa,
        interests: student.interests,
      },
    });
    await setWorkspaceMembership(user, workspace, "STUDENT");
  }

  for (const faculty of FACULTY) {
    const user = await ensureUser(faculty);
    await prisma.facultyProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        employeeId: faculty.employeeId,
        department: J_WORKSPACE.department,
        designation: faculty.designation,
        researchAreas: faculty.researchAreas,
      },
      update: {
        employeeId: faculty.employeeId,
        department: J_WORKSPACE.department,
        designation: faculty.designation,
        researchAreas: faculty.researchAreas,
      },
    });
    await setWorkspaceMembership(user, workspace, "FACULTY");
    await prisma.subjectMembership.upsert({
      where: { subjectId_userId: { subjectId: subjects.get(faculty.code).id, userId: user.id } },
      create: { subjectId: subjects.get(faculty.code).id, userId: user.id, role: "FACULTY" },
      update: { role: "FACULTY" },
    });
  }

  const jStudent = await findUserInsensitive("rohan.s@srmap.edu.in");
  const jAnnouncementTitle = "Welcome to the Section J class workspace";
  if (!(await prisma.announcement.findFirst({ where: { workspaceId: workspace.id, title: jAnnouncementTitle } }))) {
    await prisma.announcement.create({
      data: {
        workspaceId: workspace.id,
        subjectId: subjects.get("CSE 301").id,
        title: jAnnouncementTitle,
        content: "Check this workspace for class updates, resources, assessments, and timetable changes.",
        category: "GENERAL",
        priority: "MEDIUM",
        authorId: crUsers[0].id,
      },
    });
  }
  const jRequestTitle = "Request for AI course resource guidance";
  if (jStudent && !(await prisma.request.findFirst({ where: { workspaceId: workspace.id, title: jRequestTitle } }))) {
    await prisma.request.create({
      data: {
        workspaceId: workspace.id,
        studentId: jStudent.id,
        title: jRequestTitle,
        category: "RESOURCE_REQUEST",
        description: "Please share recommended practice material for the current unit.",
      },
    });
  }

  const isolationWorkspace = await ensureWorkspace(G_WORKSPACE);
  await ensureWorkspaceSettings(isolationWorkspace);
  const gCr1 = await ensureUser({ name: "Demo Section G CR 1", email: "cr1_section_g@srmap.edu.in" });
  const gCr2 = await ensureUser({ name: "Demo Section G CR 2", email: "cr2_section_g@srmap.edu.in" });
  const gStudent = await ensureUser({ name: "Bhavya Kumar", email: "bhavya.k@srmap.edu.in" });
  await setWorkspaceMembership(gCr1, isolationWorkspace, "CR");
  await setWorkspaceMembership(gCr2, isolationWorkspace, "CR");
  await setWorkspaceMembership(gStudent, isolationWorkspace, "STUDENT");
  const gAnnouncementTitle = "Section G workspace welcome";
  if (!(await prisma.announcement.findFirst({ where: { workspaceId: isolationWorkspace.id, title: gAnnouncementTitle } }))) {
    await prisma.announcement.create({
      data: {
        workspaceId: isolationWorkspace.id,
        title: gAnnouncementTitle,
        content: "This demo notice belongs only to the Section G workspace.",
        category: "GENERAL",
        priority: "MEDIUM",
        authorId: gCr1.id,
      },
    });
  }

  console.log(`J-Connect workspace ready; approved initial CR memberships: ${crUsers.length}.`);
  console.log(`Seeded J-Connect subjects: ${subjects.size}, demo students: ${STUDENTS.length}, demo faculty: ${FACULTY.length}.`);
  console.log("Seeded isolated Section G fixtures for tenant-isolation tests.");
}

main()
  .catch((error) => {
    console.error("J-Connect bootstrap failed:", error?.code || error?.name || "UnknownError");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
