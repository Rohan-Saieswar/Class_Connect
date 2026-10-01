"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CalendarClock, FileText } from "lucide-react";

interface WidgetStatus {
  connected: boolean;
  status?: string;
  lastSyncAt?: string | null;
  counts?: { courses: number; announcements: number; coursework: number; materials: number; submissions: number };
}

export default function GoogleClassroomWidget({ section }: { section: string }) {
  const [status, setStatus] = useState<WidgetStatus | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/${encodeURIComponent(section)}/classroom`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<WidgetStatus> : null)
      .then((result) => { if (active && result) setStatus(result); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [section]);

  const href = `/class/${encodeURIComponent(section)}/classroom`;
  const counts = status?.counts;
  return (
    <section className="border p-5 sm:p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center bg-[#842343]/10 text-[#842343]"><BookOpen size={19} /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#842343]">Personal integration</p>
            <h2 className="mt-1 font-serif text-xl" style={{ color: "var(--text-primary)" }}>My Google Classroom</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{status?.connected ? "Your connected Classroom account" : "Connect your own Classroom account"}</p>
          </div>
        </div>
        <a href={href} className="inline-flex h-10 items-center gap-2 border border-[#842343] px-4 text-sm font-semibold text-[#842343] hover:bg-[#842343]/5">{status?.connected ? "Open Classroom" : "Connect"}<ArrowRight size={15} /></a>
      </div>
      {status?.connected && counts && (
        <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4" style={{ borderColor: "var(--border-subtle)" }}>
          <Metric Icon={BookOpen} label="Courses" value={counts.courses} />
          <Metric Icon={FileText} label="Upcoming assignments" value={counts.coursework} />
          <Metric Icon={CalendarClock} label="Deadlines" value={counts.coursework} />
          <Metric Icon={FileText} label="Returned submissions" value={counts.submissions} />
        </div>
      )}
      {status?.connected && <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>{status.status === "REAUTH_REQUIRED" ? "Reconnect required" : status.lastSyncAt ? `Last synced ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.lastSyncAt))}` : "Not synced yet"}</p>}
    </section>
  );
}

function Metric({ Icon, label, value }: { Icon: typeof BookOpen; label: string; value: number }) {
  return <div className="flex items-center gap-2"><Icon size={15} className="text-[#842343]" /><div><p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{value}</p><p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}</p></div></div>;
}
