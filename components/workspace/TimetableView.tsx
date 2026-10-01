
"use client";
import type { WorkspaceBranding } from "@/lib/branding";

interface Props { branding: WorkspaceBranding; }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS = ["8:00–8:50", "9:00–9:50", "10:00–10:50", "11:00–11:50", "12:00–12:50", "2:00–2:50", "3:00–3:50"];

const TIMETABLE: Record<string, Record<string, { subject: string; room: string; type: string } | null>> = {
  Monday: {
    "8:00–8:50":    { subject: "Data Structures", room: "LH-301", type: "Lecture" },
    "9:00–9:50":    { subject: "Machine Learning", room: "LH-301", type: "Lecture" },
    "10:00–10:50":  { subject: "DS Lab", room: "CS Lab-1", type: "Lab" },
    "11:00–11:50":  { subject: "DS Lab", room: "CS Lab-1", type: "Lab" },
    "12:00–12:50":  null,
    "2:00–2:50":    { subject: "Algorithm Design", room: "LH-302", type: "Lecture" },
    "3:00–3:50":    { subject: "Professional Skills", room: "LH-201", type: "Lecture" },
  },
  Tuesday: {
    "8:00–8:50":    { subject: "Machine Learning", room: "LH-301", type: "Lecture" },
    "9:00–9:50":    { subject: "Database Systems", room: "LH-302", type: "Lecture" },
    "10:00–10:50":  { subject: "ML Lab", room: "CS Lab-2", type: "Lab" },
    "11:00–11:50":  { subject: "ML Lab", room: "CS Lab-2", type: "Lab" },
    "12:00–12:50":  null,
    "2:00–2:50":    { subject: "Algorithm Design", room: "LH-302", type: "Lecture" },
    "3:00–3:50":    null,
  },
  Wednesday: {
    "8:00–8:50":    { subject: "Data Structures", room: "LH-301", type: "Lecture" },
    "9:00–9:50":    { subject: "Database Systems", room: "LH-302", type: "Lecture" },
    "10:00–10:50":  null,
    "11:00–11:50":  { subject: "Machine Learning", room: "LH-301", type: "Lecture" },
    "12:00–12:50":  null,
    "2:00–2:50":    { subject: "Database Lab", room: "CS Lab-1", type: "Lab" },
    "3:00–3:50":    { subject: "Database Lab", room: "CS Lab-1", type: "Lab" },
  },
  Thursday: {
    "8:00–8:50":    { subject: "Algorithm Design", room: "LH-302", type: "Lecture" },
    "9:00–9:50":    { subject: "Data Structures", room: "LH-301", type: "Lecture" },
    "10:00–10:50":  { subject: "Professional Skills", room: "LH-201", type: "Lecture" },
    "11:00–11:50":  null,
    "12:00–12:50":  null,
    "2:00–2:50":    { subject: "Elective", room: "LH-304", type: "Lecture" },
    "3:00–3:50":    { subject: "Elective", room: "LH-304", type: "Lecture" },
  },
  Friday: {
    "8:00–8:50":    { subject: "Database Systems", room: "LH-302", type: "Lecture" },
    "9:00–9:50":    { subject: "Machine Learning", room: "LH-301", type: "Lecture" },
    "10:00–10:50":  null,
    "11:00–11:50":  { subject: "Data Structures", room: "LH-301", type: "Lecture" },
    "12:00–12:50":  null,
    "2:00–2:50":    null,
    "3:00–3:50":    null,
  },
};

const SUBJECT_COLORS: Record<string, string> = {
  "Data Structures": "#6366f1",
  "Machine Learning": "#10b981",
  "Algorithm Design": "#f59e0b",
  "Database Systems": "#06b6d4",
  "DS Lab": "#8b5cf6",
  "ML Lab": "#14b8a6",
  "Database Lab": "#0ea5e9",
  "Professional Skills": "#ec4899",
  "Elective": "#84cc16",
};

const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

export default function TimetableView({ branding }: Props) {
  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>🗓️ Class Timetable</h2>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <span>Today:</span>
          <span className="font-semibold" style={{ color: branding.accentColor }}>{today}</span>
        </div>
      </div>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-primary)" }}>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)", width: "120px" }}>Time</th>
                {DAYS.map(d => (
                  <th
                    key={d}
                    className="px-4 py-3 text-left font-semibold"
                    style={{
                      color: d === today ? branding.accentColor : "var(--text-secondary)",
                      background: d === today ? branding.accentColor + "15" : undefined,
                    }}
                  >
                    {d}
                    {d === today && <span className="ml-1 text-xs">(Today)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot, si) => (
                <tr key={slot} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td className="px-4 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{slot}</td>
                  {DAYS.map(day => {
                    const cell = TIMETABLE[day]?.[slot];
                    const color = cell ? (SUBJECT_COLORS[cell.subject] || branding.accentColor) : branding.accentColor;
                    return (
                      <td
                        key={day}
                        className="px-3 py-2"
                        style={{ background: day === today ? branding.accentColor + "08" : undefined }}
                      >
                        {cell ? (
                          <div
                            className="rounded-lg px-3 py-2"
                            style={{ background: color + "18", borderLeft: `3px solid ${color}` }}
                          >
                            <p className="font-semibold text-xs" style={{ color }}>{cell.subject}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{cell.room}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }}>{cell.type}</p>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-xs" style={{ color: "var(--border-medium)" }}>—</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
