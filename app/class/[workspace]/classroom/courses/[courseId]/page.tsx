import { notFound, redirect } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";
import { getClassroomContext } from "@/lib/classroom-access";
import { prisma } from "@/lib/prisma";

interface CoursePageProps {
  params: Promise<{ workspace: string; courseId: string }>;
}

export default async function ClassroomCoursePage({ params }: CoursePageProps) {
  const { workspace: section, courseId } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) {
    if (context.status === 401) redirect(`/login?next=${encodeURIComponent(`/class/${section}/classroom/courses/${courseId}`)}`);
    return <main className="grid min-h-screen place-items-center bg-[var(--bg-primary)] px-6 text-[var(--text-primary)]"><p>{context.error}</p></main>;
  }
  if (!context.connection) redirect(`/class/${section}/classroom`);

  const course = await prisma.googleClassroomCourse.findFirst({
    where: {
      id: courseId,
      connectionId: context.connection.id,
      userId: context.user.id,
      workspaceId: context.workspace.id,
      isRemoved: false,
    },
  });
  if (!course) notFound();

  const [announcements, coursework, materials, topics] = await Promise.all([
    prisma.googleClassroomAnnouncement.findMany({
      where: { connectionId: context.connection.id, courseId: course.id, userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false },
      orderBy: { googleCreatedAt: "desc" },
    }),
    prisma.googleClassroomCoursework.findMany({
      where: { connectionId: context.connection.id, courseId: course.id, userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false },
      include: { submissions: { where: { connectionId: context.connection.id, userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false } } },
      orderBy: { googleUpdatedAt: "desc" },
    }),
    prisma.googleClassroomMaterial.findMany({
      where: { connectionId: context.connection.id, courseId: course.id, userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false },
      orderBy: { googleCreatedAt: "desc" },
    }),
    prisma.googleClassroomTopic.findMany({
      where: { connectionId: context.connection.id, courseId: course.id, userId: context.user.id, workspaceId: context.workspace.id, isRemoved: false },
      orderBy: { position: "asc" },
    }),
  ]);

  const cardStyle = { background: "var(--bg-card)", borderColor: "var(--border-subtle)" };
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-4 py-7 text-[var(--text-primary)] sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <a href={`/class/${section}/classroom`} className="text-sm font-semibold text-[#842343]">← My Google Classroom</a>
        <header className="border-b pb-5" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#842343]">Google Classroom course</p>
          <h1 className="mt-2 font-serif text-3xl">{course.name}</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{[course.section, course.room, course.courseState].filter(Boolean).join(" · ")}</p>
          {course.descriptionHeading && <h2 className="mt-4 text-sm font-semibold">{course.descriptionHeading}</h2>}
          {course.description && <p className="mt-1 max-w-3xl whitespace-pre-wrap text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{course.description}</p>}
          {course.alternateLink && <a href={course.alternateLink} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#842343]">Open in Google Classroom <ExternalLink size={14} /></a>}
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[{ label: "Announcements", count: announcements.length }, { label: "Coursework", count: coursework.length }, { label: "Materials", count: materials.length }, { label: "Topics", count: topics.length }].map((item) => <div key={item.label} className="border p-4" style={cardStyle}><p className="text-2xl font-semibold">{item.count}</p><p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{item.label}</p></div>)}
        </section>

        <section className="border p-5" style={cardStyle}><h2 className="font-serif text-xl">Announcements</h2><div className="mt-3 divide-y" style={{ borderColor: "var(--border-subtle)" }}>{announcements.map((item) => <article key={item.id} className="py-4"><p className="whitespace-pre-wrap text-sm leading-6">{item.text}</p><p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>{item.state || "Google Classroom"} · {item.googleCreatedAt?.toLocaleString() || "Date unavailable"}</p>{item.alternateLink && <a href={item.alternateLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#842343]">Open in Classroom <ExternalLink size={13} /></a>}</article>)}</div>{announcements.length===0&&<p className="mt-3 text-sm" style={{color:"var(--text-secondary)"}}>No announcements for this course.</p>}</section>

        <section className="border p-5" style={cardStyle}><h2 className="font-serif text-xl">Classwork and assignments</h2><div className="mt-3 divide-y" style={{ borderColor: "var(--border-subtle)" }}>{coursework.map((item) => { const submission = item.submissions[0]; return <article key={item.id} className="py-4"><div className="flex items-start gap-3"><FileText size={17} className="mt-1 text-[#842343]" /><div className="min-w-0 flex-1"><p className="font-semibold">{item.title}</p><p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: "var(--text-secondary)" }}>{item.description}</p><p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>{item.workType || "Coursework"} · {item.state || "State unavailable"}{item.maxPoints !== null ? ` · ${item.maxPoints} points` : ""}</p>{submission?.state && <p className="mt-2 text-xs">My submission: {submission.state}{submission.late ? " · Late" : ""}{submission.assignedGrade !== null ? ` · Google Classroom Grade: ${submission.assignedGrade}` : ""}</p>}{item.alternateLink && <a href={item.alternateLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#842343]">Open assignment <ExternalLink size={13} /></a>}</div></div></article>})}</div>{coursework.length===0&&<p className="mt-3 text-sm" style={{color:"var(--text-secondary)"}}>No coursework for this course.</p>}</section>

        <section className="grid gap-5 lg:grid-cols-2"><div className="border p-5" style={cardStyle}><h2 className="font-serif text-xl">Materials</h2><div className="mt-3 space-y-3">{materials.map((item)=><article key={item.id} className="border-t pt-3"><p className="font-medium">{item.title||"Course material"}</p>{item.description&&<p className="mt-1 text-sm" style={{color:"var(--text-secondary)"}}>{item.description}</p>}{item.alternateLink&&<a href={item.alternateLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#842343]">Open in Classroom <ExternalLink size={13}/></a>}</article>)}</div>{materials.length===0&&<p className="mt-3 text-sm" style={{color:"var(--text-secondary)"}}>No materials for this course.</p>}</div><div className="border p-5" style={cardStyle}><h2 className="font-serif text-xl">Topics</h2><div className="mt-3 space-y-2">{topics.map((topic)=><p key={topic.id} className="border-t pt-2 text-sm">{topic.name}</p>)}</div>{topics.length===0&&<p className="mt-3 text-sm" style={{color:"var(--text-secondary)"}}>No topics for this course.</p>}</div></section>
      </div>
    </main>
  );
}
