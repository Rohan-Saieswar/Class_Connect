import "server-only";
import crypto from "crypto";
import type { OAuth2Client } from "google-auth-library";
import type { GoogleClassroomUserConnection } from "@prisma/client";
import { classroomApiGet, createConnectedClassroomClient } from "@/lib/google-classroom";
import { prisma } from "@/lib/prisma";

type GoogleResource = Record<string, any>;

async function listAll<T extends GoogleResource>(client: OAuth2Client, path: string, key: string): Promise<T[]> {
  const values: T[] = [];
  let pageToken: string | undefined;
  const seenPageTokens = new Set<string>();
  do {
    const query = new URLSearchParams({ pageSize: "100" });
    if (pageToken) query.set("pageToken", pageToken);
    const separator = path.includes("?") ? "&" : "?";
    const result = await classroomApiGet<Record<string, unknown>>(client, `${path}${separator}${query.toString()}`);
    const batch = result[key];
    if (Array.isArray(batch)) values.push(...batch as T[]);
    const nextPageToken = typeof result.nextPageToken === "string" ? result.nextPageToken : undefined;
    if (nextPageToken && seenPageTokens.has(nextPageToken)) throw new Error("CLASSROOM_PAGINATION_TOKEN_REPEATED");
    if (nextPageToken) seenPageTokens.add(nextPageToken);
    pageToken = nextPageToken;
  } while (pageToken);
  return values;
}

function toDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resourceJson(value: unknown): string {
  return JSON.stringify(value ?? []);
}

async function createPersonalNotification(
  connection: GoogleClassroomUserConnection,
  resourceType: string,
  resourceId: string,
  title: string,
  message: string,
) {
  await prisma.googleClassroomNotification.upsert({
    where: { connectionId_resourceType_resourceId: { connectionId: connection.id, resourceType, resourceId } },
    create: { connectionId: connection.id, userId: connection.userId, workspaceId: connection.workspaceId, resourceType, resourceId, title, message },
    update: {},
  });
}

function normalizeAttachment(value: GoogleResource) {
  const drive = value.driveFile?.driveFile ?? value.driveFile;
  const youtube = value.youtubeVideo;
  const form = value.form;
  const link = value.link;
  const media = drive ? "DRIVE_FILE" : youtube ? "YOUTUBE_VIDEO" : form ? "FORM" : link ? "LINK" : "OTHER";
  const url = drive?.alternateLink || youtube?.alternateLink || form?.formUrl || link?.url || value.linkData?.url;
  const resourceId = drive?.id || youtube?.id || form?.formId || form?.formUrl || link?.url || value.id;
  const googleAttachmentId = typeof resourceId === "string"
    ? resourceId
    : crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
  return {
    googleAttachmentId,
    attachmentType: media,
    title: drive?.title || youtube?.title || form?.title || link?.title || value.title || null,
    description: typeof value.description === "string" ? value.description : null,
    url: typeof url === "string" ? url : null,
    thumbnailUrl: drive?.thumbnailUrl || youtube?.thumbnailUrl || form?.thumbnailUrl || link?.thumbnailUrl || null,
    driveFileId: typeof drive?.id === "string" ? drive.id : null,
    metadataJson: JSON.stringify(value),
  };
}

async function syncAttachments(
  connection: GoogleClassroomUserConnection,
  parentType: string,
  parentId: string,
  rawAttachments: unknown,
  syncedAt: Date,
) {
  const attachments = Array.isArray(rawAttachments) ? rawAttachments as GoogleResource[] : [];
  const seenIds = new Set<string>();
  for (const raw of attachments) {
    if (!raw || typeof raw !== "object") continue;
    const attachment = normalizeAttachment(raw);
    seenIds.add(attachment.googleAttachmentId);
    await prisma.googleClassroomAttachment.upsert({
      where: {
        connectionId_parentType_parentId_googleAttachmentId: {
          connectionId: connection.id,
          parentType,
          parentId,
          googleAttachmentId: attachment.googleAttachmentId,
        },
      },
      create: {
        connectionId: connection.id,
        userId: connection.userId,
        workspaceId: connection.workspaceId,
        parentType,
        parentId,
        ...attachment,
        lastSeenAt: syncedAt,
        isRemoved: false,
        removedAt: null,
      },
      update: {
        ...attachment,
        lastSeenAt: syncedAt,
        isRemoved: false,
        removedAt: null,
      },
    });
  }

  const result = await prisma.googleClassroomAttachment.updateMany({
    where: {
      connectionId: connection.id,
      parentType,
      parentId,
      isRemoved: false,
      ...(seenIds.size ? { googleAttachmentId: { notIn: [...seenIds] } } : {}),
    },
    data: { isRemoved: true, removedAt: syncedAt },
  });
  return result.count;
}

function safeApiError(error: unknown): { status?: number; code?: string } {
  if (!error || typeof error !== "object") return {};
  const value = error as { response?: { status?: unknown; data?: { error?: { status?: unknown } } }; code?: unknown };
  const status = value.response?.status;
  const providerCode = value.response?.data?.error?.status;
  const code = value.code;
  return {
    ...(typeof status === "number" ? { status } : {}),
    ...(typeof providerCode === "string" && /^[A-Z_]+$/.test(providerCode) ? { code: providerCode } : {}),
    ...(typeof code === "string" && /^E[A-Z]+$/.test(code) ? { code } : {}),
  };
}

export async function syncClassroomConnection(
  connection: GoogleClassroomUserConnection,
) {
  const log = await prisma.googleClassroomSyncLog.create({
    data: {
      connectionId: connection.id,
      userId: connection.userId,
      workspaceId: connection.workspaceId,
      status: "SYNCING",
    },
  });

  try {
    const client = createConnectedClassroomClient(connection);
    const courses = await listAll<GoogleResource>(
      client,
      "courses?courseStates=ACTIVE&courseStates=ARCHIVED&courseStates=PROVISIONED&courseStates=DECLINED&courseStates=SUSPENDED",
      "courses",
    );
    const counts = { courses: 0, announcements: 0, coursework: 0, materials: 0, topics: 0, submissions: 0 };
    const created = { announcements: 0, coursework: 0 };
    const removed = { courses: 0, announcements: 0, coursework: 0, materials: 0, topics: 0, submissions: 0, attachments: 0 };
    const seenCourseIds = new Set<string>();
    const syncStartedAt = new Date(log.startedAt);

    for (const item of courses) {
      if (typeof item.id !== "string" || typeof item.name !== "string") continue;
      seenCourseIds.add(item.id);
      const course = await prisma.googleClassroomCourse.upsert({
        where: { connectionId_googleCourseId: { connectionId: connection.id, googleCourseId: item.id } },
        create: {
          connectionId: connection.id,
          userId: connection.userId,
          workspaceId: connection.workspaceId,
          googleCourseId: item.id,
          name: item.name,
          section: typeof item.section === "string" ? item.section : null,
          room: typeof item.room === "string" ? item.room : null,
          description: typeof item.description === "string" ? item.description : null,
          descriptionHeading: typeof item.descriptionHeading === "string" ? item.descriptionHeading : null,
          ownerGoogleUserId: typeof item.ownerId === "string" ? item.ownerId : null,
          courseState: typeof item.courseState === "string" ? item.courseState : null,
          alternateLink: typeof item.alternateLink === "string" ? item.alternateLink : null,
          googleCreatedAt: toDate(item.creationTime),
          lastUpdatedAt: toDate(item.updateTime),
          lastSeenAt: syncStartedAt,
          isRemoved: false,
          removedAt: null,
        },
        update: {
          name: item.name,
          section: typeof item.section === "string" ? item.section : null,
          room: typeof item.room === "string" ? item.room : null,
          description: typeof item.description === "string" ? item.description : null,
          descriptionHeading: typeof item.descriptionHeading === "string" ? item.descriptionHeading : null,
          ownerGoogleUserId: typeof item.ownerId === "string" ? item.ownerId : null,
          courseState: typeof item.courseState === "string" ? item.courseState : null,
          alternateLink: typeof item.alternateLink === "string" ? item.alternateLink : null,
          googleCreatedAt: toDate(item.creationTime),
          lastUpdatedAt: toDate(item.updateTime),
          lastSeenAt: syncStartedAt,
          isRemoved: false,
          removedAt: null,
        },
      });
      counts.courses += 1;
      const coursePath = `courses/${encodeURIComponent(item.id)}`;

      const topics = await listAll<GoogleResource>(client, `${coursePath}/topics`, "topic");
      const seenTopicIds = new Set<string>();
      for (const topic of topics) {
        if (typeof topic.topicId !== "string" || typeof topic.name !== "string") continue;
        seenTopicIds.add(topic.topicId);
        await prisma.googleClassroomTopic.upsert({
          where: { connectionId_googleTopicId: { connectionId: connection.id, googleTopicId: topic.topicId } },
          create: {
            connectionId: connection.id,
            courseId: course.id,
            userId: connection.userId,
            workspaceId: connection.workspaceId,
            googleTopicId: topic.topicId,
            name: topic.name,
            position: typeof topic.position === "number" ? topic.position : null,
            lastSeenAt: syncStartedAt,
            isRemoved: false,
            removedAt: null,
          },
          update: { courseId: course.id, name: topic.name, position: typeof topic.position === "number" ? topic.position : null, lastSeenAt: syncStartedAt, isRemoved: false, removedAt: null },
        });
        counts.topics += 1;
      }
      const staleTopics = await prisma.googleClassroomTopic.updateMany({
        where: { connectionId: connection.id, courseId: course.id, isRemoved: false, ...(seenTopicIds.size ? { googleTopicId: { notIn: [...seenTopicIds] } } : {}) },
        data: { isRemoved: true, removedAt: syncStartedAt },
      });
      removed.topics += staleTopics.count;

      const announcements = await listAll<GoogleResource>(client, `${coursePath}/announcements`, "announcements");
      const seenAnnouncementIds = new Set<string>();
      for (const announcement of announcements) {
        if (typeof announcement.id !== "string") continue;
        seenAnnouncementIds.add(announcement.id);
        const existed = await prisma.googleClassroomAnnouncement.findUnique({
          where: { connectionId_googleAnnouncementId: { connectionId: connection.id, googleAnnouncementId: announcement.id } },
          select: { id: true },
        });
        await prisma.googleClassroomAnnouncement.upsert({
          where: { connectionId_googleAnnouncementId: { connectionId: connection.id, googleAnnouncementId: announcement.id } },
          create: {
            connectionId: connection.id,
            courseId: course.id,
            userId: connection.userId,
            workspaceId: connection.workspaceId,
            googleAnnouncementId: announcement.id,
            text: typeof announcement.text === "string" ? announcement.text : "",
            state: typeof announcement.state === "string" ? announcement.state : null,
            topicId: typeof announcement.topicId === "string" ? announcement.topicId : null,
            materialsJson: resourceJson(announcement.materials),
            alternateLink: typeof announcement.alternateLink === "string" ? announcement.alternateLink : null,
            googleCreatedAt: toDate(announcement.creationTime),
            googleUpdatedAt: toDate(announcement.updateTime),
            lastSeenAt: syncStartedAt,
            isRemoved: false,
            removedAt: null,
          },
          update: {
            courseId: course.id,
            text: typeof announcement.text === "string" ? announcement.text : "",
            state: typeof announcement.state === "string" ? announcement.state : null,
            topicId: typeof announcement.topicId === "string" ? announcement.topicId : null,
            materialsJson: resourceJson(announcement.materials),
            alternateLink: typeof announcement.alternateLink === "string" ? announcement.alternateLink : null,
            googleCreatedAt: toDate(announcement.creationTime),
            googleUpdatedAt: toDate(announcement.updateTime),
            lastSeenAt: syncStartedAt,
            isRemoved: false,
            removedAt: null,
          },
        });
        removed.attachments += await syncAttachments(connection, "ANNOUNCEMENT", announcement.id, announcement.materials, syncStartedAt);
        if (!existed) {
          created.announcements += 1;
          await createPersonalNotification(connection, "ANNOUNCEMENT", announcement.id, "New Google Classroom announcement", typeof announcement.text === "string" ? announcement.text.slice(0, 180) : "New announcement");
        }
        counts.announcements += 1;
      }
      const staleAnnouncements = await prisma.googleClassroomAnnouncement.updateMany({
        where: { connectionId: connection.id, courseId: course.id, isRemoved: false, ...(seenAnnouncementIds.size ? { googleAnnouncementId: { notIn: [...seenAnnouncementIds] } } : {}) },
        data: { isRemoved: true, removedAt: syncStartedAt },
      });
      removed.announcements += staleAnnouncements.count;

      const materials = await listAll<GoogleResource>(client, `${coursePath}/courseWorkMaterials`, "courseWorkMaterial");
      const seenMaterialIds = new Set<string>();
      for (const material of materials) {
        if (typeof material.id !== "string") continue;
        seenMaterialIds.add(material.id);
        await prisma.googleClassroomMaterial.upsert({
          where: { connectionId_googleMaterialId: { connectionId: connection.id, googleMaterialId: material.id } },
          create: {
            connectionId: connection.id,
            courseId: course.id,
            userId: connection.userId,
            workspaceId: connection.workspaceId,
            googleMaterialId: material.id,
            title: typeof material.title === "string" ? material.title : null,
            description: typeof material.description === "string" ? material.description : null,
            state: typeof material.state === "string" ? material.state : null,
            topicId: typeof material.topicId === "string" ? material.topicId : null,
            materialsJson: resourceJson(material.materials),
            alternateLink: typeof material.alternateLink === "string" ? material.alternateLink : null,
            googleCreatedAt: toDate(material.creationTime),
            googleUpdatedAt: toDate(material.updateTime),
            lastSeenAt: syncStartedAt,
            isRemoved: false,
            removedAt: null,
          },
          update: {
            courseId: course.id,
            title: typeof material.title === "string" ? material.title : null,
            description: typeof material.description === "string" ? material.description : null,
            state: typeof material.state === "string" ? material.state : null,
            topicId: typeof material.topicId === "string" ? material.topicId : null,
            materialsJson: resourceJson(material.materials),
            alternateLink: typeof material.alternateLink === "string" ? material.alternateLink : null,
            googleCreatedAt: toDate(material.creationTime),
            googleUpdatedAt: toDate(material.updateTime),
            lastSeenAt: syncStartedAt,
            isRemoved: false,
            removedAt: null,
          },
        });
        removed.attachments += await syncAttachments(connection, "COURSEWORK_MATERIAL", material.id, material.materials, syncStartedAt);
        counts.materials += 1;
      }
      const staleMaterials = await prisma.googleClassroomMaterial.updateMany({
        where: { connectionId: connection.id, courseId: course.id, isRemoved: false, ...(seenMaterialIds.size ? { googleMaterialId: { notIn: [...seenMaterialIds] } } : {}) },
        data: { isRemoved: true, removedAt: syncStartedAt },
      });
      removed.materials += staleMaterials.count;

      const courseworkItems = await listAll<GoogleResource>(client, `${coursePath}/courseWork`, "courseWork");
      const seenCourseworkIds = new Set<string>();
      for (const courseworkItem of courseworkItems) {
        if (typeof courseworkItem.id !== "string" || typeof courseworkItem.title !== "string") continue;
        seenCourseworkIds.add(courseworkItem.id);
        const existed = await prisma.googleClassroomCoursework.findUnique({
          where: { connectionId_googleCourseworkId: { connectionId: connection.id, googleCourseworkId: courseworkItem.id } },
          select: { id: true },
        });
        const coursework = await prisma.googleClassroomCoursework.upsert({
          where: { connectionId_googleCourseworkId: { connectionId: connection.id, googleCourseworkId: courseworkItem.id } },
          create: {
            connectionId: connection.id,
            courseId: course.id,
            userId: connection.userId,
            workspaceId: connection.workspaceId,
            googleCourseworkId: courseworkItem.id,
            title: courseworkItem.title,
            description: typeof courseworkItem.description === "string" ? courseworkItem.description : null,
            state: typeof courseworkItem.state === "string" ? courseworkItem.state : null,
            workType: typeof courseworkItem.workType === "string" ? courseworkItem.workType : null,
            topicId: typeof courseworkItem.topicId === "string" ? courseworkItem.topicId : null,
            dueDateJson: courseworkItem.dueDate ? JSON.stringify(courseworkItem.dueDate) : null,
            dueTimeJson: courseworkItem.dueTime ? JSON.stringify(courseworkItem.dueTime) : null,
            maxPoints: typeof courseworkItem.maxPoints === "number" ? courseworkItem.maxPoints : null,
            materialsJson: resourceJson(courseworkItem.materials),
            alternateLink: typeof courseworkItem.alternateLink === "string" ? courseworkItem.alternateLink : null,
            googleCreatedAt: toDate(courseworkItem.creationTime),
            googleUpdatedAt: toDate(courseworkItem.updateTime),
            lastSeenAt: syncStartedAt,
            isRemoved: false,
            removedAt: null,
          },
          update: {
            courseId: course.id,
            title: courseworkItem.title,
            description: typeof courseworkItem.description === "string" ? courseworkItem.description : null,
            state: typeof courseworkItem.state === "string" ? courseworkItem.state : null,
            workType: typeof courseworkItem.workType === "string" ? courseworkItem.workType : null,
            topicId: typeof courseworkItem.topicId === "string" ? courseworkItem.topicId : null,
            dueDateJson: courseworkItem.dueDate ? JSON.stringify(courseworkItem.dueDate) : null,
            dueTimeJson: courseworkItem.dueTime ? JSON.stringify(courseworkItem.dueTime) : null,
            maxPoints: typeof courseworkItem.maxPoints === "number" ? courseworkItem.maxPoints : null,
            materialsJson: resourceJson(courseworkItem.materials),
            alternateLink: typeof courseworkItem.alternateLink === "string" ? courseworkItem.alternateLink : null,
            googleCreatedAt: toDate(courseworkItem.creationTime),
            googleUpdatedAt: toDate(courseworkItem.updateTime),
            lastSeenAt: syncStartedAt,
            isRemoved: false,
            removedAt: null,
          },
        });
        removed.attachments += await syncAttachments(connection, "COURSEWORK", courseworkItem.id, courseworkItem.materials, syncStartedAt);
        if (!existed) {
          created.coursework += 1;
          await createPersonalNotification(connection, "COURSEWORK", courseworkItem.id, "New Google Classroom coursework", courseworkItem.title);
        }
        counts.coursework += 1;

        const submissions = await listAll<GoogleResource>(
          client,
          `${coursePath}/courseWork/${encodeURIComponent(courseworkItem.id)}/studentSubmissions?userId=me`,
          "studentSubmissions",
        );
        const seenSubmissionIds = new Set<string>();
        for (const submission of submissions) {
          if (typeof submission.id !== "string") continue;
          seenSubmissionIds.add(submission.id);
          await prisma.googleClassroomSubmission.upsert({
            where: { connectionId_googleSubmissionId: { connectionId: connection.id, googleSubmissionId: submission.id } },
            create: {
              connectionId: connection.id,
              courseworkId: coursework.id,
              userId: connection.userId,
              workspaceId: connection.workspaceId,
              googleSubmissionId: submission.id,
              state: typeof submission.state === "string" ? submission.state : null,
              late: typeof submission.late === "boolean" ? submission.late : null,
              assignedGrade: typeof submission.assignedGrade === "number" ? submission.assignedGrade : null,
              alternateLink: typeof submission.alternateLink === "string" ? submission.alternateLink : null,
              googleCreatedAt: toDate(submission.creationTime),
              googleUpdatedAt: toDate(submission.updateTime),
              lastSeenAt: syncStartedAt,
              isRemoved: false,
              removedAt: null,
            },
            update: {
              courseworkId: coursework.id,
              state: typeof submission.state === "string" ? submission.state : null,
              late: typeof submission.late === "boolean" ? submission.late : null,
              assignedGrade: typeof submission.assignedGrade === "number" ? submission.assignedGrade : null,
              alternateLink: typeof submission.alternateLink === "string" ? submission.alternateLink : null,
              googleCreatedAt: toDate(submission.creationTime),
              googleUpdatedAt: toDate(submission.updateTime),
              lastSeenAt: syncStartedAt,
              isRemoved: false,
              removedAt: null,
            },
          });
          counts.submissions += 1;
        }
        const staleSubmissions = await prisma.googleClassroomSubmission.updateMany({
          where: { connectionId: connection.id, courseworkId: coursework.id, isRemoved: false, ...(seenSubmissionIds.size ? { googleSubmissionId: { notIn: [...seenSubmissionIds] } } : {}) },
          data: { isRemoved: true, removedAt: syncStartedAt },
        });
        removed.submissions += staleSubmissions.count;
      }
      const staleCoursework = await prisma.googleClassroomCoursework.updateMany({
        where: { connectionId: connection.id, courseId: course.id, isRemoved: false, ...(seenCourseworkIds.size ? { googleCourseworkId: { notIn: [...seenCourseworkIds] } } : {}) },
        data: { isRemoved: true, removedAt: syncStartedAt },
      });
      removed.coursework += staleCoursework.count;
    }

    const staleCourses = await prisma.googleClassroomCourse.findMany({
      where: { connectionId: connection.id, isRemoved: false, ...(seenCourseIds.size ? { googleCourseId: { notIn: [...seenCourseIds] } } : {}) },
      select: { id: true },
    });
    if (staleCourses.length) {
      const staleCourseIds = staleCourses.map((course) => course.id);
      const [announcementParents, courseworkParents, materialParents] = await Promise.all([
        prisma.googleClassroomAnnouncement.findMany({ where: { connectionId: connection.id, courseId: { in: staleCourseIds } }, select: { googleAnnouncementId: true } }),
        prisma.googleClassroomCoursework.findMany({ where: { connectionId: connection.id, courseId: { in: staleCourseIds } }, select: { googleCourseworkId: true } }),
        prisma.googleClassroomMaterial.findMany({ where: { connectionId: connection.id, courseId: { in: staleCourseIds } }, select: { googleMaterialId: true } }),
      ]);
      const removeData = { isRemoved: true, removedAt: syncStartedAt };
      const [courseUpdate, announcementUpdate, courseworkUpdate, materialUpdate, topicUpdate, submissionUpdate] = await Promise.all([
        prisma.googleClassroomCourse.updateMany({ where: { id: { in: staleCourseIds }, isRemoved: false }, data: removeData }),
        prisma.googleClassroomAnnouncement.updateMany({ where: { connectionId: connection.id, courseId: { in: staleCourseIds }, isRemoved: false }, data: removeData }),
        prisma.googleClassroomCoursework.updateMany({ where: { connectionId: connection.id, courseId: { in: staleCourseIds }, isRemoved: false }, data: removeData }),
        prisma.googleClassroomMaterial.updateMany({ where: { connectionId: connection.id, courseId: { in: staleCourseIds }, isRemoved: false }, data: removeData }),
        prisma.googleClassroomTopic.updateMany({ where: { connectionId: connection.id, courseId: { in: staleCourseIds }, isRemoved: false }, data: removeData }),
        prisma.googleClassroomSubmission.updateMany({ where: { connectionId: connection.id, coursework: { courseId: { in: staleCourseIds } }, isRemoved: false }, data: removeData }),
      ]);
      removed.courses += courseUpdate.count;
      removed.announcements += announcementUpdate.count;
      removed.coursework += courseworkUpdate.count;
      removed.materials += materialUpdate.count;
      removed.topics += topicUpdate.count;
      removed.submissions += submissionUpdate.count;

      const attachmentSets = [
        { parentType: "ANNOUNCEMENT", ids: announcementParents.map((item) => item.googleAnnouncementId) },
        { parentType: "COURSEWORK", ids: courseworkParents.map((item) => item.googleCourseworkId) },
        { parentType: "COURSEWORK_MATERIAL", ids: materialParents.map((item) => item.googleMaterialId) },
      ];
      for (const set of attachmentSets) {
        if (!set.ids.length) continue;
        const result = await prisma.googleClassroomAttachment.updateMany({
          where: { connectionId: connection.id, parentType: set.parentType, parentId: { in: set.ids }, isRemoved: false },
          data: removeData,
        });
        removed.attachments += result.count;
      }
    }

    const syncedAt = new Date();
    const summary = { checked: counts, created, removed };
    await prisma.googleClassroomUserConnection.update({
      where: { id: connection.id },
      data: { status: "CONNECTED", lastSyncAt: syncedAt },
    });
    await prisma.googleClassroomSyncLog.update({
      where: { id: log.id },
      data: { status: "COMPLETED", completedAt: syncedAt, summaryJson: JSON.stringify(summary), warningsJson: "[]" },
    });
    return { syncedAt, counts: summary };
  } catch (error) {
    const safeError = safeApiError(error);
    const errorCode = safeError.status === 401 ? "REAUTH_REQUIRED" : safeError.status === 403 ? "CLASSROOM_ACCESS_DENIED" : "CLASSROOM_SYNC_FAILED";
    await prisma.googleClassroomUserConnection.update({
      where: { id: connection.id },
      data: { status: errorCode === "REAUTH_REQUIRED" ? "REAUTH_REQUIRED" : "SYNC_FAILED" },
    });
    await prisma.googleClassroomSyncLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorCode, warningsJson: JSON.stringify(safeError), completedAt: new Date() },
    });
    throw new Error(errorCode);
  }
}
