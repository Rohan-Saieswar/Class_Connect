import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();
const SESSION_SECRET = process.env.AUTH_SECRET || "section-connect-production-secret-token-key-2026";
const initialCrEmail1 = process.env.INITIAL_CR_EMAIL_1?.trim().toLowerCase();
const initialCrEmail2 = process.env.INITIAL_CR_EMAIL_2?.trim().toLowerCase();

if (!process.argv.includes("--reset")) {
  console.error("This legacy seed deletes existing database records. Use npm run db:seed:reset only for a disposable database.");
  process.exit(1);
}
if (!initialCrEmail1?.endsWith("@srmap.edu.in") || !initialCrEmail2?.endsWith("@srmap.edu.in") || initialCrEmail1 === initialCrEmail2) {
  console.error("Set two distinct INITIAL_CR_EMAIL_1 and INITIAL_CR_EMAIL_2 @srmap.edu.in values before resetting seed data.");
  process.exit(1);
}

function hashPassword(password) {
  const salt = crypto.createHash("sha256").update(SESSION_SECRET).digest("hex").slice(0, 16);
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 Starting Section-Connect database seeding...");

  // Clear existing data cleanly
  try {
    await prisma.auditLog.deleteMany();
    await prisma.bookmark.deleteMany();
    await prisma.reaction.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.timetableEntry.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.calendarEvent.deleteMany();
    await prisma.pollVote.deleteMany();
    await prisma.pollOption.deleteMany();
    await prisma.poll.deleteMany();
    await prisma.requestComment.deleteMany();
    await prisma.request.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.emailNotification.deleteMany();
    await prisma.report.deleteMany();
    await prisma.studyGroupMembership.deleteMany();
    await prisma.studyGroup.deleteMany();
    await prisma.messageParticipant.deleteMany();
    await prisma.message.deleteMany();
    await prisma.facultyJoinRequest.deleteMany();
    await prisma.subjectMembership.deleteMany();
    await prisma.announcement.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.workspaceSettings.deleteMany();
    await prisma.workspaceMembership.deleteMany();
    await prisma.studentProfile.deleteMany();
    await prisma.facultyProfile.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.file.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.user.deleteMany();
    console.log("✓ Cleared prior records");
  } catch (err) {
    console.log("Clean slate ready");
  }

  const defaultPassword = hashPassword("Connect@123");

  // 1. Create System Admin
  const sysAdmin = await prisma.user.create({
    data: {
      email: "admin@srmap.edu.in",
      name: "Dr. Vikram Singh (Dean / Platform Admin)",
      passwordHash: defaultPassword,
      isVerified: true,
      globalRole: "SYSTEM_ADMIN",
      userPreference: {
        create: { language: "en", theme: "system", emailDigest: "DAILY" },
      },
    },
  });
  console.log("✓ Created System Admin: admin@srmap.edu.in");

  // ==========================================
  // 2. CREATE WORKSPACE: J-Connect (Section J)
  // ==========================================
  const workspaceJ = await prisma.workspace.create({
    data: {
      universityId: "srmap",
      universityName: "SRM University–AP",
      department: "Computer Science and Engineering",
      program: "B.Tech",
      specialization: "Artificial Intelligence and Machine Learning",
      section: "J", // Source of truth
      displayName: "CSE AI & ML — Section J",
      generatedName: "J-Connect", // ${section}-Connect
      academicYear: "2026–27",
      semester: 5,
      description: "Official digital workspace for B.Tech CSE AI & ML Section J (Batch 2024-2028).",
      accentColor: "#842343",
      status: "ACTIVE",
      createdById: sysAdmin.id,
      settings: {
        create: {
          allowStudentPosts: true,
          allowAnonymousFeedback: true,
          defaultTimetableSlots: 7,
          attendanceThreshold: 75.0,
        },
      },
    },
  });
  console.log("✓ Created Workspace J-Connect (Section J)");

  // 3. Create CR 1 & CR 2 for Section J
  const cr1J = await prisma.user.create({
    data: {
      email: initialCrEmail1,
      name: "J-Connect CR 1",
      passwordHash: defaultPassword,
      isVerified: true,
      studentProfile: {
        create: {
          rollNumber: "AP23110010001",
          currentSemester: 5,
          cgpa: 9.42,
          bio: "CR 1 for Section J | AI & Deep Learning enthusiast",
          skills: "Python, PyTorch, React, Next.js, Git",
          interests: "Autonomous Systems, Hackathons, Basketball",
          github: "https://github.com/aarav-sharma-srm",
          linkedin: "https://linkedin.com/in/aarav-sharma-srm",
        },
      },
      userPreference: {
        create: { language: "en", theme: "system", emailDigest: "DAILY" },
      },
      memberships: {
        create: {
          workspaceId: workspaceJ.id,
          role: "CR",
          status: "APPROVED",
        },
      },
    },
  });

  const cr2J = await prisma.user.create({
    data: {
      email: initialCrEmail2,
      name: "J-Connect CR 2",
      passwordHash: defaultPassword,
      isVerified: true,
      studentProfile: {
        create: {
          rollNumber: "AP23110010002",
          currentSemester: 5,
          cgpa: 9.58,
          bio: "CR 2 for Section J | Student Council Coordinator & ML Researcher",
          skills: "Algorithms, TensorFlow, Node.js, Public Speaking",
          interests: "Robotics, Classical Dance, Tech Debates",
          github: "https://github.com/ananya-reddy-srm",
          linkedin: "https://linkedin.com/in/ananya-reddy-srm",
        },
      },
      userPreference: {
        create: { language: "en", theme: "dark", emailDigest: "DAILY" },
      },
      memberships: {
        create: {
          workspaceId: workspaceJ.id,
          role: "CR",
          status: "APPROVED",
        },
      },
    },
  });
  console.log("✓ Created Section J CR memberships from the configured initial CR emails");

  // 4. Create Faculty for Section J
  const facultyAI = await prisma.user.create({
    data: {
      email: "ramesh.k@srmap.edu.in",
      name: "Dr. K. Ramesh",
      passwordHash: defaultPassword,
      isVerified: true,
      facultyProfile: {
        create: {
          employeeId: "EMP-CSE-310",
          department: "Computer Science and Engineering",
          designation: "Associate Professor",
          cabin: "Academic Block ALH-408",
          qualification: "Ph.D. in Computer Science (IIT Madras)",
          researchAreas: "Deep Learning, Explainable AI, Computer Vision",
          officeHours: "Mon & Wed 03:00 PM – 05:00 PM",
        },
      },
      memberships: {
        create: {
          workspaceId: workspaceJ.id,
          role: "FACULTY",
          status: "APPROVED",
        },
      },
    },
  });

  const facultyCloud = await prisma.user.create({
    data: {
      email: "sneha.v@srmap.edu.in",
      name: "Dr. Sneha Varma",
      passwordHash: defaultPassword,
      isVerified: true,
      facultyProfile: {
        create: {
          employeeId: "EMP-CSE-412",
          department: "Computer Science and Engineering",
          designation: "Assistant Professor",
          cabin: "Academic Block ALH-415",
          qualification: "Ph.D. in Distributed Systems",
          researchAreas: "Cloud Architecture, Kubernetes, Edge Computing",
          officeHours: "Tue & Thu 02:00 PM – 04:00 PM",
        },
      },
      memberships: {
        create: {
          workspaceId: workspaceJ.id,
          role: "FACULTY",
          status: "APPROVED",
        },
      },
    },
  });

  // 5. Create Students for Section J
  const studentsJData = [
    { name: "Rohan Saieswar", email: "rohan.s@srmap.edu.in", roll: "AP23110010003" },
    { name: "Pooja Venkatesh", email: "pooja.v@srmap.edu.in", roll: "AP23110010004" },
    { name: "Karthik Subramanian", email: "karthik.s@srmap.edu.in", roll: "AP23110010005" },
    { name: "Deepika Nair", email: "deepika.n@srmap.edu.in", roll: "AP23110010006" },
    { name: "Aditya Verma", email: "aditya.v@srmap.edu.in", roll: "AP23110010007" },
    { name: "Snehal Patil", email: "snehal.p@srmap.edu.in", roll: "AP23110010008" },
  ];

  const studentUsersJ = [];
  for (const s of studentsJData) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        name: s.name,
        passwordHash: defaultPassword,
        isVerified: true,
        studentProfile: {
          create: {
            rollNumber: s.roll,
            currentSemester: 5,
            cgpa: 8.9,
            bio: `B.Tech CSE (AI & ML) Section J student`,
          },
        },
        memberships: {
          create: {
            workspaceId: workspaceJ.id,
            role: "STUDENT",
            status: "APPROVED",
          },
        },
      },
    });
    studentUsersJ.push(user);
  }
  console.log(`✓ Created ${studentUsersJ.length} Section J Students`);

  // 6. Subjects for Section J
  const subAI = await prisma.subject.create({
    data: {
      workspaceId: workspaceJ.id,
      code: "CSE 301",
      name: "Artificial Intelligence & Neural Networks",
      description: "Foundations of heuristic search, knowledge representation, perceptrons, and backpropagation.",
      credits: 4,
      semester: 5,
      color: "#6366f1",
      icon: "Brain",
    },
  });

  const subDL = await prisma.subject.create({
    data: {
      workspaceId: workspaceJ.id,
      code: "CSE 302",
      name: "Deep Learning Architectures",
      description: "Convolutional Networks, RNNs, Transformers, and Generative Adversarial Networks.",
      credits: 4,
      semester: 5,
      color: "#ec4899",
      icon: "Cpu",
    },
  });

  const subCloud = await prisma.subject.create({
    data: {
      workspaceId: workspaceJ.id,
      code: "CSE 303",
      name: "Cloud Virtualization & Distributed Systems",
      description: "Containerization, microservices, consensus protocols, and serverless architectures.",
      credits: 3,
      semester: 5,
      color: "#06b6d4",
      icon: "Cloud",
    },
  });

  const subAutomata = await prisma.subject.create({
    data: {
      workspaceId: workspaceJ.id,
      code: "CSE 304",
      name: "Formal Languages & Automata Theory",
      description: "DFA, NFA, context-free grammars, pushdown automata, and Turing machines.",
      credits: 4,
      semester: 5,
      color: "#f59e0b",
      icon: "Binary",
    },
  });

  // 7. Announcements for J-Connect
  await prisma.announcement.create({
    data: {
      workspaceId: workspaceJ.id,
      subjectId: subAI.id,
      title: "🚨 CLA 1 Assessment Schedule & Syllabus Announcement",
      content:
        "Continuous Learning Assessment 1 (CLA 1) for AI & Neural Networks will be conducted on Monday, October 13 from 10:00 AM to 11:30 AM in ALH-304. Syllabus covers Units 1 & 2 (Search Algorithms through Multilayer Perceptrons). All students must carry physical ID cards.",
      category: "EXAMINATION",
      priority: "URGENT",
      isPinned: true,
      authorId: cr1J.id,
      publishedAt: new Date(),
    },
  });

  await prisma.announcement.create({
    data: {
      workspaceId: workspaceJ.id,
      subjectId: subDL.id,
      title: "🎓 Guest Lecture: LLM Fine-Tuning in Industry by Google AI",
      content:
        "We are thrilled to announce a dedicated industry guest session with Google DeepMind researchers on Friday at 02:00 PM in the Main Auditorium. RSVP on the Events tab to reserve your front-row seat.",
      category: "EVENT",
      priority: "HIGH",
      isPinned: false,
      authorId: cr2J.id,
      publishedAt: new Date(Date.now() - 3600000 * 24),
    },
  });

  await prisma.announcement.create({
    data: {
      workspaceId: workspaceJ.id,
      title: "📋 Section J Timetable Room Change for Wednesdays",
      content:
        "Please note that the Wednesday Period 3 Cloud Computing Lab has been relocated to CSE Lab 5 (Level 3) to accommodate GPU test clusters.",
      category: "ACADEMIC",
      priority: "MEDIUM",
      isPinned: false,
      authorId: cr1J.id,
      publishedAt: new Date(Date.now() - 3600000 * 48),
    },
  });

  // 8. Timetable for Section J
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  const periods = [
    { num: 1, start: "09:00 AM", end: "09:50 AM", sub: subAI, room: "ALH-304", fac: "Dr. K. Ramesh", type: "LECTURE" },
    { num: 2, start: "10:00 AM", end: "10:50 AM", sub: subDL, room: "ALH-304", fac: "Dr. K. Ramesh", type: "LECTURE" },
    { num: 3, start: "11:00 AM", end: "11:50 AM", sub: subCloud, room: "CSE Lab 5", fac: "Dr. Sneha Varma", type: "LAB" },
    { num: 4, start: "01:30 PM", end: "02:20 PM", sub: subAutomata, room: "ALH-304", fac: "Prof. Manoj Kumar", type: "LECTURE" },
    { num: 5, start: "02:30 PM", end: "03:20 PM", sub: subAI, room: "ALH-304", fac: "Dr. K. Ramesh", type: "TUTORIAL" },
  ];

  for (const day of days) {
    for (const p of periods) {
      await prisma.timetableEntry.create({
        data: {
          workspaceId: workspaceJ.id,
          subjectId: p.sub.id,
          dayOfWeek: day,
          periodNumber: p.num,
          startTime: p.start,
          endTime: p.end,
          room: p.room,
          building: "Academic Block",
          facultyName: p.fac,
          type: p.type,
          status: "NORMAL",
        },
      });
    }
  }

  // 9. Exams for Section J
  await prisma.exam.create({
    data: {
      workspaceId: workspaceJ.id,
      subjectId: subAI.id,
      title: "CLA 1 Assessment",
      type: "CLA",
      date: new Date(Date.now() + 86400000 * 5),
      startTime: "10:00 AM",
      endTime: "11:30 AM",
      venue: "Hall 304, Academic Block",
      syllabus: "Unit 1: Heuristic Search & Alpha-Beta Pruning. Unit 2: Single and Multi-layer Perceptrons.",
      maxMarks: 50,
      weightage: "15%",
    },
  });

  await prisma.exam.create({
    data: {
      workspaceId: workspaceJ.id,
      subjectId: subDL.id,
      title: "Deep Learning Mid-Semester Examination",
      type: "MID_SEM",
      date: new Date(Date.now() + 86400000 * 20),
      startTime: "09:30 AM",
      endTime: "12:30 PM",
      venue: "Central Exam Hall 2",
      syllabus: "Units 1, 2, and 3: CNN Architectures, ResNet, Attention Mechanisms.",
      maxMarks: 100,
      weightage: "30%",
    },
  });

  // 10. Assignments for Section J
  await prisma.assignment.create({
    data: {
      workspaceId: workspaceJ.id,
      subjectId: subAI.id,
      authorId: facultyAI.id,
      title: "Problem Set 1: Vectorized MLP & Backpropagation from Scratch",
      description:
        "Implement a 3-layer neural network using only NumPy. Compute forward and backward passes analytically and train on MNIST to achieve > 96% accuracy. Submit Jupyter Notebook.",
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 86400000 * 7),
      totalMarks: 50,
      submissionInstructions: "Submit your .ipynb notebook with execution outputs via GitHub Classroom or LMS.",
    },
  });

  await prisma.assignment.create({
    data: {
      workspaceId: workspaceJ.id,
      subjectId: subCloud.id,
      authorId: facultyCloud.id,
      title: "Cloud Lab 2: Multi-Container Microservice Deployment",
      description:
        "Create Dockerfiles and docker-compose orchestration for an express REST API, Redis cache, and Postgres DB with volume mounts.",
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 86400000 * 10),
      totalMarks: 40,
    },
  });

  // 11. Resources for Section J
  await prisma.resource.create({
    data: {
      workspaceId: workspaceJ.id,
      subjectId: subAI.id,
      authorId: facultyAI.id,
      title: "Unit 1 Lecture Slides: State-Space Search & Adversarial Minimax",
      description: "Official presentation slides covering BFS, DFS, A* heuristics, and game trees.",
      category: "PPT",
      unit: 1,
      fileUrl: "https://drive.google.com/sample/unit1-search.pptx",
      fileType: "pptx",
      fileSize: "14.5 MB",
    },
  });

  await prisma.resource.create({
    data: {
      workspaceId: workspaceJ.id,
      subjectId: subAI.id,
      authorId: cr1J.id,
      title: "Comprehensive Handwritten Notes: Backpropagation Derivation",
      description: "Step-by-step calculus derivation of gradient flow through matrix dimensions.",
      category: "NOTES",
      unit: 2,
      fileUrl: "https://drive.google.com/sample/backprop-notes.pdf",
      fileType: "pdf",
      fileSize: "4.8 MB",
    },
  });

  // 12. Academic Q&A for Section J
  const q1 = await prisma.question.create({
    data: {
      workspaceId: workspaceJ.id,
      subjectId: subAI.id,
      authorId: studentUsersJ[0].id,
      title: "How does Adam optimizer adapt the learning rate compared to RMSProp?",
      details:
        "I understand that RMSProp uses an exponentially decaying average of squared gradients. But Adam also maintains the first moment (momentum). Does the bias correction term play a significant role in initial epochs?",
      topic: "Optimization Algorithms",
      tags: "optimization,adam,gradient-descent",
      isSolved: true,
    },
  });

  await prisma.answer.create({
    data: {
      questionId: q1.id,
      authorId: facultyAI.id,
      content:
        "Excellent question Rohan! In early iterations, both the first moment m_t and second moment v_t are initialized to zero. Dividing by (1 - beta^t) counteracts the initialization bias toward zero. RMSProp does not have bias correction, so early step sizes can be erratic.",
      isFacultyAnswer: true,
      isAccepted: true,
      upvotesCount: 14,
    },
  });

  // 13. Feed Posts & Discussion for Section J
  const p1 = await prisma.post.create({
    data: {
      workspaceId: workspaceJ.id,
      authorId: cr1J.id,
      channel: "general",
      type: "DISCUSSION",
      title: "🚀 Welcome to J-Connect: Our Official Section J Digital Platform!",
      content:
        "Hey everyone! Welcome to J-Connect, our new all-in-one class portal for CSE AI & ML Section J. Here you can check daily timetables, download notes, ask academic doubts, track deadlines, and submit class requests directly to CRs and Faculty. Let us know your feedback!",
      isPinned: true,
    },
  });

  await prisma.comment.create({
    data: {
      postId: p1.id,
      authorId: studentUsersJ[1].id,
      content: "This looks super sleek! Loving the dark mode and direct timetable schedule.",
    },
  });

  // 14. Class Requests for Section J
  await prisma.request.create({
    data: {
      workspaceId: workspaceJ.id,
      studentId: studentUsersJ[0].id,
      title: "Attendance Correction for Cloud Computing Lab on Sept 28",
      category: "ATTENDANCE_CORRECTION",
      description:
        "I attended the physical lab session on Friday Sept 28 (Seat 24), but LMS shows marked absent. Submitted my lab sign-in sheet copy to CR.",
      urgency: "MEDIUM",
      status: "UNDER_REVIEW",
      reviewedById: cr1J.id,
    },
  });

  await prisma.request.create({
    data: {
      workspaceId: workspaceJ.id,
      studentId: studentUsersJ[2].id,
      title: "Request for GPU cluster credentials for Deep Learning Assignment",
      category: "RESOURCE_REQUEST",
      description:
        "Need access to the university NVIDIA A100 server for training the ResNet model without local memory bottleneck.",
      urgency: "HIGH",
      status: "APPROVED",
      resolutionNotes: "Cluster logins emailed to all Section J students by CR 2.",
      reviewedById: cr2J.id,
    },
  });

  // 15. Polls for Section J
  const poll1 = await prisma.poll.create({
    data: {
      workspaceId: workspaceJ.id,
      authorId: cr1J.id,
      question: "Which timing is preferred for the Deep Learning Hands-on Doubt Session?",
      description: "Dr. K. Ramesh agreed to host a 90-minute live coding session this Saturday.",
      isMultipleChoice: false,
      isAnonymous: false,
      resultsVisibility: "ALWAYS",
      deadline: new Date(Date.now() + 86400000 * 3),
      options: {
        create: [
          { text: "Saturday 10:00 AM – 11:30 AM", voteCount: 18 },
          { text: "Saturday 02:00 PM – 03:30 PM", voteCount: 9 },
          { text: "Saturday 05:00 PM – 06:30 PM", voteCount: 4 },
        ],
      },
    },
  });

  // 16. Audit Log for Section J
  await prisma.auditLog.create({
    data: {
      workspaceId: workspaceJ.id,
      actorId: cr1J.id,
      action: "WORKSPACE_INITIALIZED",
      targetType: "WORKSPACE",
      targetId: workspaceJ.id,
      newStateJson: JSON.stringify({ name: "J-Connect", section: "J", semester: 5 }),
    },
  });

  // ==========================================
  // 17. CREATE WORKSPACE: G-Connect (Section G)
  // (Demonstrates Complete Multi-Tenant Isolation!)
  // ==========================================
  const workspaceG = await prisma.workspace.create({
    data: {
      universityId: "srmap",
      universityName: "SRM University–AP",
      department: "Computer Science and Engineering",
      program: "B.Tech",
      specialization: "Artificial Intelligence and Machine Learning",
      section: "G", // Source of truth for Section G
      displayName: "CSE AI & ML — Section G",
      generatedName: "G-Connect", // ${section}-Connect
      academicYear: "2026–27",
      semester: 5,
      description: "Official digital workspace for B.Tech CSE AI & ML Section G.",
      accentColor: "#10b981", // Emerald accent
      status: "ACTIVE",
      createdById: sysAdmin.id,
      settings: {
        create: {
          allowStudentPosts: true,
          allowAnonymousFeedback: true,
          defaultTimetableSlots: 7,
          attendanceThreshold: 75.0,
        },
      },
    },
  });
  console.log("✓ Created Workspace G-Connect (Section G) for Multi-Tenant Isolation");

  // Section G CRs (Completely distinct from J-Connect!)
  const cr1G = await prisma.user.create({
    data: {
      email: "cr1_section_g@srmap.edu.in",
      name: "Varun Teja",
      passwordHash: defaultPassword,
      isVerified: true,
      studentProfile: {
        create: {
          rollNumber: "AP23110010101",
          currentSemester: 5,
          cgpa: 9.3,
          bio: "CR 1 for Section G",
        },
      },
      memberships: {
        create: {
          workspaceId: workspaceG.id,
          role: "CR",
          status: "APPROVED",
        },
      },
    },
  });

  // Section G Student
  const studentG = await prisma.user.create({
    data: {
      email: "bhavya.k@srmap.edu.in",
      name: "Bhavya Kapoor",
      passwordHash: defaultPassword,
      isVerified: true,
      studentProfile: {
        create: {
          rollNumber: "AP23110010102",
          currentSemester: 5,
          cgpa: 9.1,
          bio: "Student in Section G",
        },
      },
      memberships: {
        create: {
          workspaceId: workspaceG.id,
          role: "STUDENT",
          status: "APPROVED",
        },
      },
    },
  });

  // Section G Exclusive Announcement (Section J members must NEVER see this!)
  await prisma.announcement.create({
    data: {
      workspaceId: workspaceG.id,
      title: "🔒 Section G Private Notice: Lab Room Allocation",
      content:
        "This is an internal Section G announcement strictly for Section G members. Section J must not be able to read this.",
      category: "ACADEMIC",
      priority: "HIGH",
      authorId: cr1G.id,
      publishedAt: new Date(),
    },
  });

  console.log("✨ Seed completed successfully!");
  console.log("-----------------------------------------------------------------");
  console.log("🚀 Initial Workspaces:");
  console.log("   • J-Connect: SRM University–AP • CSE AI & ML — Section J");
  console.log("   • G-Connect: SRM University–AP • CSE AI & ML — Section G");
  console.log("   • J-Connect initial CR memberships come from INITIAL_CR_EMAIL_1 and INITIAL_CR_EMAIL_2");
  console.log("-----------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
