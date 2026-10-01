
"use client";
import type { WorkspaceBranding } from "@/lib/branding";

interface Props { branding: WorkspaceBranding; }

const EXAMS = [
  { subject: "Data Structures", date: "Oct 15, 2026", time: "9:00 AM", room: "Block A – 101", type: "Mid Sem", syllabus: "Units 1–3: Arrays, Linked Lists, Trees, Graphs", marks: 30 },
  { subject: "Machine Learning", date: "Oct 17, 2026", time: "11:00 AM", room: "Block B – 201", type: "Mid Sem", syllabus: "Units 1–3: Regression, Classification, Clustering", marks: 30 },
  { subject: "Database Systems", date: "Oct 20, 2026", time: "9:00 AM", room: "Block A – 102", type: "Mid Sem", syllabus: "Units 1–2: ER Model, SQL, Normalization", marks: 30 },
  { subject: "Algorithm Design", date: "Dec 5, 2026", time: "9:00 AM", room: "TBA", type: "End Sem", syllabus: "All Units", marks: 60 },
];

export default function ExamsView({ branding }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>📝 Examination Schedule</h2>
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: branding.accentColor + "15", border: `1px solid ${branding.accentColor}30` }}
      >
        <span className="text-2xl">⚠️</span>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Bring your college ID card to all exams. Hall tickets will be shared 3 days before the exam.
        </p>
      </div>
      <div className="space-y-4">
        {EXAMS.map((e, i) => (
          <div key={i} className="interactive-card rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: branding.accentColor + "20", color: branding.accentColor }}>{e.type}</span>
                <h3 className="mt-2 text-base font-semibold" style={{ color: "var(--text-primary)" }}>{e.subject}</h3>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg" style={{ color: branding.accentColor }}>{e.date}</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{e.time}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-xl p-3" style={{ background: "var(--bg-primary)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Venue</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{e.room}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: "var(--bg-primary)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Max Marks</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{e.marks}</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl p-3" style={{ background: "var(--bg-primary)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Syllabus</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{e.syllabus}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
