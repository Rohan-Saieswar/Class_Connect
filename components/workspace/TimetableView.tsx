"use client";
import { useEffect, useState } from "react";
import type { WorkspaceBranding } from "@/lib/branding";

interface Props { branding: WorkspaceBranding; }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SLOTS = [
  { no: 1, time: "09:00 – 09:50" },
  { no: 2, time: "10:00 – 10:50" },
  { no: 3, time: "11:00 – 11:50" },
  { no: 4, time: "12:00 – 12:50" },
  { no: 5, time: "01:00 – 01:50" },
  { no: 6, time: "02:00 – 02:50" },
  { no: 7, time: "03:00 – 03:50" },
  { no: 8, time: "04:00 – 05:30" },
];

type Subject = { code: string; name: string; ltpc: string; faculty: string; color: string };

const SUBJECTS: Subject[] = [
  { code: "AEC 101", name: "Art of Listening, Speaking and Reading Skills", ltpc: "1-1-0-2", faculty: "Dr. Ashwathi", color: "#db2777" },
  { code: "CSE 101", name: "Fundamentals of Computing and Programming in C", ltpc: "3-0-1-5", faculty: "Dr. Sushovan Khatua, Mr. Kammula Sunil Kumar", color: "#4f46e5" },
  { code: "FIC 102", name: "Engineering Physics", ltpc: "2-0-1-3", faculty: "Dr. Argha Jit Jana", color: "#0d9488" },
  { code: "FIC 103", name: "Calculus for Engineers", ltpc: "3-0-0-3", faculty: "Dr. Deeptajyoti Sen", color: "#d97706" },
  { code: "SEC 101", name: "Analytical Reasoning and Aptitude Skills - I", ltpc: "1-0-1-2", faculty: "Mr. Skilling Course", color: "#7c3aed" },
  { code: "VAC 101", name: "Environmental Science", ltpc: "2-0-0-2", faculty: "Dr. Prasun Goswami", color: "#16a34a" },
];

const byCode = (code: string) => SUBJECTS.find((s) => s.code === code)!;

// Keyed by slot number (1 to 8), copied from the SRM student portal timetable.
type Entry = { code: string; room: string };
const TIMETABLE: Record<string, Record<number, Entry>> = {
  Monday: {
    1: { code: "FIC 102", room: "V306" }, 2: { code: "FIC 102", room: "V306" },
    5: { code: "CSE 101", room: "V401" }, 6: { code: "CSE 101", room: "V401" },
  },
  Tuesday: {
    1: { code: "CSE 101", room: "V106" }, 2: { code: "CSE 101", room: "V106" },
    7: { code: "FIC 102", room: "V401" },
  },
  Wednesday: {
    2: { code: "FIC 103", room: "V401" }, 3: { code: "FIC 103", room: "V401" },
    4: { code: "CSE 101", room: "V401" },
  },
  Thursday: {
    1: { code: "VAC 101", room: "V401" }, 2: { code: "VAC 101", room: "V401" },
    3: { code: "CSE 101", room: "V603" }, 4: { code: "CSE 101", room: "V603" },
    8: { code: "SEC 101", room: "V401" },
  },
  Friday: {
    1: { code: "AEC 101", room: "V401" }, 2: { code: "AEC 101", room: "V401" },
    4: { code: "FIC 102", room: "V401" },
    7: { code: "FIC 103", room: "V401" },
    8: { code: "SEC 101", room: "V401" },
  },
  Saturday: {},
};

export default function TimetableView({ branding: _branding }: Props) {
  const [today, setToday] = useState<string | null>(null);

  // Read today's day in the browser only, to avoid a server/client mismatch.
  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-US", { weekday: "long" }));
  }, []);

  return (
    <div className="space-y-8">
      <div
        className="overflow-x-auto rounded-2xl border"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-primary)" }}
      >
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-28 border-b p-3 text-left font-semibold" style={{ borderColor: "var(--border-subtle)" }}>
                Day
              </th>
              {SLOTS.map((s) => (
                <th key={s.no} className="border-b border-l p-3 text-center" style={{ borderColor: "var(--border-subtle)" }}>
                  <div className="text-xs font-normal" style={{ color: "var(--text-secondary)" }}>
                    Slot {s.no}
                  </div>
                  <div className="font-semibold">{s.time}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d) => (
              <tr key={d} style={today === d ? { background: "rgba(132, 35, 67, 0.06)" } : undefined}>
                <th
                  className="border-b p-3 text-left font-semibold"
                  style={{ borderColor: "var(--border-subtle)", color: today === d ? "#842343" : undefined }}
                >
                  {d}
                  {today === d && (
                    <span className="ml-2 rounded-full bg-[#842343] px-2 py-0.5 text-[10px] font-semibold text-white">
                      Today
                    </span>
                  )}
                </th>
                {SLOTS.map((s) => {
                  const entry = TIMETABLE[d]?.[s.no];
                  const subject = entry ? byCode(entry.code) : null;
                  return (
                    <td
                      key={s.no}
                      className="h-20 border-b border-l p-1.5 align-middle"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      {entry && subject ? (
                        <div
                          className="h-full rounded-lg border-l-4 px-2 py-1.5 text-center"
                          style={{ background: `${subject.color}1f`, borderLeftColor: subject.color }}
                        >
                          <div className="font-semibold" style={{ color: subject.color }}>{entry.code}</div>
                          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{entry.room}</div>
                        </div>
                      ) : (
                        <div className="text-center" style={{ color: "var(--text-secondary)" }}>–</div>
                      )}
                    </td>
                  );
                })}
              </tr>))}
          </tbody>
        </table>
      </div>

      <div
        className="overflow-x-auto rounded-2xl border"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-primary)" }}
      >
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr style={{ background: "rgba(132, 35, 67, 0.06)" }}>
              <th className="p-3 text-left font-semibold">Subject</th>
              <th className="p-3 text-left font-semibold">L-T-P-C</th>
              <th className="p-3 text-left font-semibold">Faculty</th>
              <th className="p-3 text-left font-semibold">Rooms</th>
            </tr>
          </thead>
          <tbody>
            {SUBJECTS.map((s) => {
              const rooms = new Set<string>();
              Object.values(TIMETABLE).forEach((day) =>
                Object.values(day).forEach((e) => { if (e.code === s.code) rooms.add(e.room); })
              );
              return (
                <tr key={s.code}>
                  <td className="border-t p-3" style={{ borderColor: "var(--border-subtle)" }}>
                    <span className="font-semibold" style={{ color: s.color }}>{s.code}</span>{" "}
                    <span style={{ color: "var(--text-secondary)" }}>{s.name}</span>
                  </td>
                  <td className="border-t p-3" style={{ borderColor: "var(--border-subtle)" }}>{s.ltpc}</td>
                  <td className="border-t p-3" style={{ borderColor: "var(--border-subtle)" }}>{s.faculty}</td>
                  <td className="border-t p-3" style={{ borderColor: "var(--border-subtle)" }}>{[...rooms].join(", ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}