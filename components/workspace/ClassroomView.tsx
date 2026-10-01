"use client";

import { useEffect, useState } from "react";
import { BookOpen, CalendarClock, Check, ExternalLink, FileText, GraduationCap, LoaderCircle, RefreshCw, Unplug } from "lucide-react";

type ClassroomStatus = {
  connected: boolean;
  status?: string;
  googleEmail?: string;
  lastSyncAt?: string | null;
  counts?: { courses: number; announcements: number; coursework: number; materials: number; submissions: number };
};

type ClassroomCourse = { id: string; name: string; section: string | null; room: string | null; description: string | null; courseState: string | null; alternateLink: string | null };
type ClassroomAnnouncement = { id: string; googleAnnouncementId: string; text: string; topicId: string | null; googleCreatedAt: string | null; alternateLink: string | null; course: { name: string; section: string | null } };
type ClassroomCoursework = { id: string; googleCourseworkId: string; title: string; description: string | null; topicId: string | null; dueDateJson: string | null; dueTimeJson: string | null; maxPoints: number | null; alternateLink: string | null; course: { name: string; section: string | null }; submissions: { state: string | null; late: boolean | null; assignedGrade: number | null; alternateLink: string | null }[] };
type ClassroomMaterial = { id: string; googleMaterialId: string; title: string | null; description: string | null; topicId: string | null; googleCreatedAt: string | null; course: { name: string; section: string | null } };
type ClassroomAttachment = { id: string; parentType: string; parentId: string; attachmentType: string; title: string | null; description: string | null; url: string | null; thumbnailUrl: string | null; driveFileId: string | null; metadataJson: string };
type ClassroomTopic = { id: string; googleTopicId: string; name: string; course: { name: string } };
type ClassroomSubmission = { id: string; state: string | null; late: boolean | null; assignedGrade: number | null; alternateLink: string | null; coursework: { title: string; maxPoints: number | null; course: { name: string; section: string | null } } };
type ClassroomData = { courses: ClassroomCourse[]; announcements: ClassroomAnnouncement[]; coursework: ClassroomCoursework[]; materials: ClassroomMaterial[]; topics: ClassroomTopic[]; submissions: ClassroomSubmission[]; attachments: ClassroomAttachment[]; lastSyncAt: string | null; historical?: boolean; connectionStatus?: string };
type Tab = "Overview" | "Courses" | "Announcements" | "Assignments" | "Materials" | "Attachments" | "Topics" | "My Submissions" | "My Grades" | "Deadlines";

const tabs: Tab[] = ["Overview", "Courses", "Announcements", "Assignments", "Materials", "Attachments", "Topics", "My Submissions", "My Grades", "Deadlines"];
const classroomHome = "https://classroom.google.com";

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function parseJsonObject(value?: string | null): Record<string, number> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, number> : null;
  } catch {
    return null;
  }
}

function dueDateFor(item: ClassroomCoursework): Date | null {
  const date = parseJsonObject(item.dueDateJson);
  if (!date || !date.year || !date.month || !date.day) return null;
  const time = parseJsonObject(item.dueTimeJson);
  return new Date(date.year, date.month - 1, date.day, time?.hours ?? 23, time?.minutes ?? 59, time?.seconds ?? 0);
}

function maskEmail(email?: string) {
  if (!email) return "Google account";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}••••@${domain || ""}`;
}

function safeResourceUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function AttachmentList({ attachments }: { attachments: ClassroomAttachment[] }) {
  if (!attachments.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {attachments.map((attachment) => {
        const url = safeResourceUrl(attachment.url);
        const label = attachment.title || attachment.attachmentType.replaceAll("_", " ").toLowerCase();
        return url ? (
          <a key={attachment.id} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border px-3 py-2 text-sm text-[#842343]" style={{ borderColor: "var(--border-subtle)" }}>
            {attachment.thumbnailUrl && <img src={attachment.thumbnailUrl} alt="" className="h-8 w-8 object-cover" />}
            <span>{label}</span><ExternalLink size={13} />
          </a>
        ) : <span key={attachment.id} className="border px-3 py-2 text-sm" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>{label} · open in Classroom</span>;
      })}
    </div>
  );
}

export default function ClassroomView({ section, workspaceName, displayName, connectionResult }: { section: string; workspaceName: string; displayName: string; connectionResult?: string }) {
  const [status, setStatus] = useState<ClassroomStatus | null>(null);
  const [data, setData] = useState<ClassroomData | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [topicFilter, setTopicFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/${encodeURIComponent(section)}/classroom`, { cache: "no-store" });
      const nextStatus = await response.json();
      if (!response.ok) throw new Error(nextStatus.error || "Classroom status could not be loaded.");
      setStatus(nextStatus);
      if (nextStatus.connected || ["DISCONNECTED", "REAUTH_REQUIRED", "SYNC_FAILED"].includes(nextStatus.status)) {
        const dataResponse = await fetch(`/api/${encodeURIComponent(section)}/classroom/data`, { cache: "no-store" });
        const nextData = await dataResponse.json();
        if (!dataResponse.ok) throw new Error(nextData.error || "Classroom data could not be loaded.");
        setData(nextData);
      } else {
        setData(null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Classroom could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [section]);

  useEffect(() => {
    const messages: Record<string, string> = {
      connected: "Google Classroom connected. Sync to load your courses.",
      initial_sync_failed: "The account is connected, but its initial synchronization failed. Check connectivity and retry.",
      reauth_required: "Google Classroom authorization must be renewed before synchronizing.",
      cancelled: "Classroom connection was cancelled.",
      oauth_failed: "Google could not complete the Classroom connection.",
      invalid_state: "The connection request expired. Please try again.",
      refresh_token_missing: "Google did not provide offline access. Connect again and approve the requested access.",
      identity_invalid: "Google could not verify the Classroom account.",
      membership_required: "Approved membership in this workspace is required.",
      connect_failed: "Classroom could not be connected.",
      classroom_not_configured: "Google Classroom OAuth is not configured on the server.",
    };
    if (connectionResult && messages[connectionResult]) setMessage(messages[connectionResult]);
  }, [connectionResult]);

  async function syncNow() {
    setSyncing(true);
    setMessage("");
    try {
      const response = await fetch(`/api/${encodeURIComponent(section)}/classroom`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) await load();
        throw new Error(result.error || "Classroom sync failed.");
      }
      await load();
      setMessage("Classroom sync completed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Classroom sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect this Google Classroom account? Cached items will remain marked as historical.")) return;
    setMessage("");
    try {
      const response = await fetch(`/api/${encodeURIComponent(section)}/classroom`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Disconnect failed.");
      await load();
      setMessage("Google Classroom disconnected. Cached data is no longer live.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Disconnect failed.");
    }
  }

  const courses = data?.courses ?? [];
  const announcements = data?.announcements ?? [];
  const coursework = data?.coursework ?? [];
  const materials = data?.materials ?? [];
  const topics = data?.topics ?? [];
  const submissions = data?.submissions ?? [];
  const attachments = data?.attachments ?? [];
  const currentTime = Date.now();
  const upcoming = coursework.map((item) => ({ item, due: dueDateFor(item) })).filter((entry) => entry.due && entry.due.getTime() >= currentTime).sort((a, b) => a.due!.getTime() - b.due!.getTime());
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const dueToday = upcoming.filter((entry) => entry.due! <= todayEnd).length;
  const dueWeek = upcoming.filter((entry) => entry.due! <= weekEnd).length;

  function matches(text: string) {
    return text.toLowerCase().includes(search.trim().toLowerCase());
  }

  function topicName(topicId?: string | null) {
    return topics.find((topic) => topic.googleTopicId === topicId)?.name;
  }

  const buttonClass = "inline-flex h-10 items-center justify-center gap-2 border px-3 text-sm font-medium transition disabled:cursor-wait disabled:opacity-60";
  const cardStyle = { background: "var(--bg-card)", borderColor: "var(--border-subtle)" };

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-4 py-6 text-[var(--text-primary)] sm:px-7 sm:py-9">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5" style={{ borderColor: "var(--border-subtle)" }}>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#842343]"><GraduationCap size={18} /> Google Classroom</div>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl">My Google Classroom</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Your Google Classroom, connected to {workspaceName} · {displayName}.</p>
          </div>
          {status?.connected && (
            <div className="flex flex-wrap gap-2">
              <button className={`${buttonClass} border-[#d9d3ce]`} style={{ color: "var(--text-primary)" }} disabled={syncing} onClick={syncNow}>
                {syncing ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}{syncing ? "Syncing…" : "Sync Now"}
              </button>
              <button className={`${buttonClass} border-[#d9d3ce]`} style={{ color: "var(--text-primary)" }} onClick={() => setSettingsOpen(!settingsOpen)}>Settings</button>
              <button className={`${buttonClass} border-[#d9d3ce] text-[#842343]`} onClick={disconnect}><Unplug size={15} />Disconnect</button>
            </div>
          )}
          {status && !status.connected && (
            status.status === "SYNC_FAILED"
              ? <button onClick={syncNow} disabled={syncing} className="inline-flex h-10 items-center gap-2 bg-[#842343] px-4 text-sm font-semibold text-white hover:bg-[#681a35] disabled:opacity-60">{syncing ? "Syncing…" : "Retry sync"}<RefreshCw size={14} /></button>
              : <a href={`/api/${encodeURIComponent(section)}/classroom/connect`} className="inline-flex h-10 items-center gap-2 bg-[#842343] px-4 text-sm font-semibold text-white hover:bg-[#681a35]">{status.status === "REAUTH_REQUIRED" ? "Reconnect Google Classroom" : "Connect Google Classroom"}<ExternalLink size={14} /></a>
          )}
        </header>

        {message && <p role="status" className="border-l-2 border-[#842343] bg-[#842343]/5 px-4 py-3 text-sm">{message}</p>}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading Google Classroom">
            {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse border" style={{ ...cardStyle, background: "var(--bg-secondary)" }} />)}
          </div>
        ) : !status?.connected && !data ? (
          <section className="grid min-h-[360px] place-items-center border px-6 py-12 text-center" style={cardStyle}>
            <div className="max-w-xl">
              <div className="mx-auto grid h-14 w-14 place-items-center border border-[#842343]/20 bg-[#842343]/5 text-[#842343]"><BookOpen size={25} /></div>
              <h2 className="mt-5 font-serif text-2xl">{status?.status === "REAUTH_REQUIRED" ? "Reconnect Google Classroom" : status?.status === "SYNC_FAILED" ? "Classroom sync needs attention" : "My Google Classroom isn’t connected yet."}</h2>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>Connect your Google Classroom account to see your courses, announcements, assignments, materials, deadlines and submissions here.</p>
              <a href={`/api/${encodeURIComponent(section)}/classroom/connect`} className="mt-6 inline-flex h-11 items-center gap-2 bg-[#842343] px-5 text-sm font-semibold text-white hover:bg-[#681a35]">Connect Google Classroom <ExternalLink size={15} /></a>
            </div>
          </section>
        ) : (
          <>
            {data?.historical && <p role="status" className="border-l-2 border-[#b99143] bg-[#b99143]/10 px-4 py-3 text-sm">This is historical data from your last sync. It is not live; reconnect Google Classroom to refresh it. Last synced: {formatDate(data.lastSyncAt)}</p>}
            <section className="flex flex-wrap items-center justify-between gap-3 border px-4 py-3" style={cardStyle}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#357451]"><Check size={15} />Connected</span>
                <span style={{ color: "var(--text-secondary)" }}>Google account: {maskEmail(status?.googleEmail)}</span>
                <span style={{ color: "var(--text-muted)" }}>Last synced: {formatDate(status?.lastSyncAt)}</span>
              </div>
              <a href={classroomHome} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-[#842343]">Open Google Classroom <ExternalLink size={14} /></a>
            </section>

            {settingsOpen && status && <section className="border px-4 py-4 text-sm" style={cardStyle}><p className="font-semibold">Connected account</p><p className="mt-1" style={{ color: "var(--text-secondary)" }}>{maskEmail(status.googleEmail)}</p><p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>Classroom authorization is personal to your account and this workspace.</p></section>}

            <nav className="flex gap-1 overflow-x-auto border-b pb-px" style={{ borderColor: "var(--border-subtle)" }} aria-label="Google Classroom views">
              {tabs.map((item) => <button key={item} onClick={() => setTab(item)} className="shrink-0 border-b-2 px-3 py-2 text-sm" style={{ borderColor: tab === item ? "#842343" : "transparent", color: tab === item ? "#842343" : "var(--text-secondary)" }} aria-current={tab === item ? "page" : undefined}>{item}</button>)}
            </nav>

            <div className="flex flex-wrap gap-3">
              <input aria-label="Search my Classroom" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search my Classroom" className="h-10 min-w-52 flex-1 border px-3 text-sm outline-none focus:border-[#842343]" style={{ background: "var(--bg-card)", borderColor: "var(--border-medium)", color: "var(--text-primary)" }} />
              <select aria-label="Filter by topic" value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)} className="h-10 border px-3 text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border-medium)", color: "var(--text-primary)" }}>
                <option value="all">All topics</option>
                {topics.map((topic) => <option key={topic.googleTopicId} value={topic.googleTopicId}>{topic.name}</option>)}
              </select>
            </div>

            {tab === "Overview" && (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Courses", value: courses.length, icon: GraduationCap },
                    { label: "Upcoming assignments", value: upcoming.length, icon: FileText },
                    { label: "Due today", value: dueToday, icon: CalendarClock },
                    { label: "Due this week", value: dueWeek, icon: CalendarClock },
                  ].map(({ label, value, icon: Icon }) => <div key={label} className="border p-4" style={cardStyle}><Icon size={17} className="text-[#842343]" /><p className="mt-4 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{label}</p></div>)}
                </div>
                <section className="border p-5" style={cardStyle}>
                  <h2 className="font-serif text-xl">Upcoming deadlines</h2>
                  <div className="mt-3 divide-y" style={{ borderColor: "var(--border-subtle)" }}>
                    {upcoming.slice(0, 5).map(({ item, due }) => <div key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{item.title} <span style={{ color: "var(--text-muted)" }}>· {item.course.name}</span></span><span className="text-[#842343]">{formatDate(due?.toISOString())}</span></div>)}
                    {upcoming.length === 0 && <p className="py-4 text-sm" style={{ color: "var(--text-secondary)" }}>No upcoming deadlines were returned for this account.</p>}
                  </div>
                </section>
                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="border p-5" style={cardStyle}><h2 className="font-serif text-xl">Recent announcements</h2><div className="mt-3 space-y-3">{announcements.slice(0, 3).map((item) => <article key={item.id} className="border-t pt-3 text-sm" style={{ borderColor: "var(--border-subtle)" }}><p className="font-medium">{item.course.name}</p><p className="mt-1 line-clamp-3" style={{ color: "var(--text-secondary)" }}>{item.text}</p></article>)}{announcements.length === 0 && <p className="pt-3 text-sm" style={{ color: "var(--text-secondary)" }}>No announcements found.</p>}</div></section>
                  <section className="border p-5" style={cardStyle}><h2 className="font-serif text-xl">Recent materials</h2><div className="mt-3 space-y-3">{materials.slice(0, 3).map((item) => <article key={item.id} className="border-t pt-3 text-sm" style={{ borderColor: "var(--border-subtle)" }}><p className="font-medium">{item.title || "Course material"}</p><p className="mt-1" style={{ color: "var(--text-secondary)" }}>{item.course.name}</p></article>)}{materials.length === 0 && <p className="pt-3 text-sm" style={{ color: "var(--text-secondary)" }}>No materials found.</p>}</div></section>
                </div>
              </div>
            )}

            {tab === "Courses" && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courses.filter((item) => matches(`${item.name} ${item.section || ""} ${item.description || ""}`)).map((course) => <article key={course.id} className="border p-5" style={cardStyle}><p className="text-xs font-semibold uppercase tracking-wide text-[#842343]">{course.courseState || "Course"}</p><h2 className="mt-3 font-serif text-xl">{course.name}</h2><p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{[course.section, course.room].filter(Boolean).join(" · ") || "Google Classroom course"}</p>{course.description && <p className="mt-3 line-clamp-3 text-sm" style={{ color: "var(--text-secondary)" }}>{course.description}</p>}<a href={`/class/${encodeURIComponent(section)}/classroom/courses/${encodeURIComponent(course.id)}`} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#842343]">Open Course <ExternalLink size={14} /></a>{course.alternateLink && <a href={course.alternateLink} target="_blank" rel="noreferrer" className="ml-4 inline-flex items-center gap-1 text-sm text-[#842343]">Open in Google Classroom <ExternalLink size={13} /></a>}</article>)}{courses.length === 0 && <Empty text="No Google Classroom courses are available for this account." onRefresh={syncNow} />}</div>}

            {tab === "Announcements" && <div className="space-y-3">{announcements.filter((item) => matches(`${item.text} ${item.course.name} ${attachments.filter((attachment) => attachment.parentType === "ANNOUNCEMENT" && attachment.parentId === item.googleAnnouncementId).map((attachment) => attachment.title || "").join(" ")}`)).map((item) => <article key={item.id} className="border p-5" style={cardStyle}><p className="text-xs font-semibold uppercase tracking-wide text-[#842343]">Google Classroom · {item.course.name}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.text}</p><p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(item.googleCreatedAt)}{topicName(item.topicId) ? ` · ${topicName(item.topicId)}` : ""}</p><AttachmentList attachments={attachments.filter((attachment) => attachment.parentType === "ANNOUNCEMENT" && attachment.parentId === item.googleAnnouncementId)} />{item.alternateLink && <OpenLink href={item.alternateLink} label="Open in Google Classroom" />}</article>)}{announcements.length === 0 && <Empty text="No announcements are available." onRefresh={syncNow} />}</div>}

            {tab === "Assignments" && <div className="space-y-3">{coursework.filter((item) => (topicFilter === "all" || item.topicId === topicFilter) && matches(`${item.title} ${item.description || ""} ${item.course.name} ${attachments.filter((attachment) => attachment.parentType === "COURSEWORK" && attachment.parentId === item.googleCourseworkId).map((attachment) => attachment.title || "").join(" ")}`)).map((item) => { const submission = item.submissions[0]; return <article key={item.id} className="border p-5" style={cardStyle}><p className="text-xs font-semibold uppercase tracking-wide text-[#842343]">Google Classroom · {item.course.name}</p><h2 className="mt-2 font-serif text-xl">{item.title}</h2>{item.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{item.description}</p>}<div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs" style={{ color: "var(--text-muted)" }}><span>Due {formatDate(dueDateFor(item)?.toISOString())}</span>{item.maxPoints !== null && <span>Maximum points: {item.maxPoints}</span>}{topicName(item.topicId) && <span>{topicName(item.topicId)}</span>}<span>{submission?.state || "No submission status"}</span>{submission?.late && <span className="text-[#a3324d]">Late</span>}</div><AttachmentList attachments={attachments.filter((attachment) => attachment.parentType === "COURSEWORK" && attachment.parentId === item.googleCourseworkId)} />{submission?.assignedGrade !== null && submission?.assignedGrade !== undefined && <p className="mt-3 text-sm font-medium">Google Classroom Grade: {submission.assignedGrade}{item.maxPoints ? ` / ${item.maxPoints}` : ""}</p>}<OpenLink href={submission?.alternateLink || item.alternateLink || classroomHome} label="Open Assignment in Classroom" /></article>})}{coursework.length === 0 && <Empty text="No coursework is available." onRefresh={syncNow} />}</div>}

            {tab === "Materials" && <div className="grid gap-3 sm:grid-cols-2">{materials.filter((item) => (topicFilter === "all" || item.topicId === topicFilter) && matches(`${item.title || ""} ${item.description || ""} ${item.course.name}`)).map((item) => <article key={item.id} className="border p-5" style={cardStyle}><p className="text-xs font-semibold uppercase tracking-wide text-[#842343]">Google Classroom · {item.course.name}</p><h2 className="mt-2 font-serif text-lg">{item.title || "Course material"}</h2>{item.description && <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{item.description}</p>}<AttachmentList attachments={attachments.filter((attachment) => attachment.parentType === "COURSEWORK_MATERIAL" && attachment.parentId === item.googleMaterialId)} /><p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>{topicName(item.topicId) || "No topic"} · {formatDate(item.googleCreatedAt)}</p></article>)}{materials.length === 0 && <Empty text="No materials are available." onRefresh={syncNow} />}</div>}

            {tab === "Attachments" && <div className="grid gap-3 sm:grid-cols-2">{attachments.filter((item) => matches(`${item.title || ""} ${item.description || ""} ${item.attachmentType} ${item.parentType}`)).map((item) => { const parentLink = item.parentType === "ANNOUNCEMENT" ? announcements.find(value => value.googleAnnouncementId === item.parentId)?.alternateLink : item.parentType === "COURSEWORK" ? coursework.find(value => value.googleCourseworkId === item.parentId)?.alternateLink : classroomHome; return <article key={item.id} className="border p-5" style={cardStyle}><p className="text-xs font-semibold uppercase tracking-wide text-[#842343]">Google Classroom · {item.attachmentType.replaceAll("_", " ").toLowerCase()}</p><h2 className="mt-2 font-serif text-lg">{item.title || "Classroom attachment"}</h2>{item.description && <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{item.description}</p>}{item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" className="mt-3 max-h-40 w-full object-contain object-left" />}<OpenLink href={safeResourceUrl(item.url) || parentLink || classroomHome} label={safeResourceUrl(item.url) ? "Open resource" : "Open in Google Classroom"} /></article>})}{attachments.length === 0 && <Empty text="No attachments are available." onRefresh={syncNow} />}</div>}

            {tab === "Topics" && <div className="grid gap-3 sm:grid-cols-2">{topics.map((topic) => <button key={topic.googleTopicId} className="border p-5 text-left" style={cardStyle} onClick={() => { setTopicFilter(topic.googleTopicId); setTab("Assignments"); }}><p className="text-xs font-semibold uppercase tracking-wide text-[#842343]">{topic.course.name}</p><h2 className="mt-2 font-serif text-xl">{topic.name}</h2><p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>View coursework in this topic</p></button>)}{topics.length === 0 && <Empty text="No topics are available." onRefresh={syncNow} />}</div>}

            {tab === "My Submissions" && <div className="space-y-3">{submissions.filter((item) => matches(`${item.coursework.title} ${item.coursework.course.name} ${item.state || ""}`)).map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 border p-5" style={cardStyle}><div><p className="text-xs font-semibold uppercase tracking-wide text-[#842343]">My submission · {item.coursework.course.name}</p><h2 className="mt-2 font-serif text-lg">{item.coursework.title}</h2><p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{item.state || "Status unavailable"}{item.late ? " · Late" : ""}</p></div>{item.alternateLink && <OpenLink href={item.alternateLink} label="Open in Classroom" />}</article>)}{submissions.length === 0 && <Empty text="No submissions are available for this account." onRefresh={syncNow} />}</div>}

            {tab === "My Grades" && <div className="space-y-3">{submissions.filter((item) => item.assignedGrade !== null && matches(`${item.coursework.title} ${item.coursework.course.name}`)).map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 border p-5" style={cardStyle}><div><p className="text-xs font-semibold uppercase tracking-wide text-[#842343]">Google Classroom Grade · {item.coursework.course.name}</p><h2 className="mt-2 font-serif text-lg">{item.coursework.title}</h2><p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{item.assignedGrade}{item.coursework.maxPoints !== null ? ` / ${item.coursework.maxPoints}` : " points"}</p></div>{item.alternateLink && <OpenLink href={item.alternateLink} label="Open in Classroom" />}</article>)}{submissions.every((item) => item.assignedGrade === null) && <Empty text="No grades have been returned to this Google account." onRefresh={syncNow} />}</div>}

            {tab === "Deadlines" && <div className="space-y-3">{upcoming.filter(({ item }) => matches(`${item.title} ${item.course.name}`)).map(({ item, due }) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 border p-5" style={cardStyle}><div><p className="text-xs font-semibold uppercase tracking-wide text-[#842343]">{item.course.name}</p><h2 className="mt-2 font-serif text-lg">{item.title}</h2><p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Due {formatDate(due?.toISOString())} · {item.submissions[0]?.state || "Status unavailable"}</p></div>{item.alternateLink && <OpenLink href={item.alternateLink} label="Open in Classroom" />}</article>)}{upcoming.length === 0 && <Empty text="No upcoming deadlines were returned for this account." onRefresh={syncNow} />}</div>}
          </>
        )}
      </div>
    </main>
  );
}

function OpenLink({ href, label }: { href: string; label: string }) {
  return <a href={href} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#842343]">{label} <ExternalLink size={14} /></a>;
}

function Empty({ text, onRefresh }: { text: string; onRefresh: () => void }) {
  return <div className="border p-8 text-center" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}><p className="text-sm" style={{ color: "var(--text-secondary)" }}>{text}</p><button onClick={onRefresh} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#842343]"><RefreshCw size={14} />Refresh</button><a href={classroomHome} target="_blank" rel="noreferrer" className="ml-4 inline-flex items-center gap-1 text-sm font-semibold text-[#842343]">Open Classroom <ExternalLink size={14} /></a></div>;
}
