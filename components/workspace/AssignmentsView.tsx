
"use client";
import { useState } from "react";
import type { WorkspaceBranding } from "@/lib/branding";
import Modal from "@/components/ui/Modal";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { Upload, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface Props { branding: WorkspaceBranding; }

const INITIAL = [
  { id: 1, title: "DS Lab 4 – BFS & DFS Implementation", subject: "Data Structures Lab", due: "Oct 12, 2026", status: "pending", marks: 20, desc: "Implement BFS and DFS on a graph using adjacency list. Submit as a .zip with code + output screenshots." },
  { id: 2, title: "ML Assignment 2 – Linear Regression", subject: "Machine Learning", due: "Oct 15, 2026", status: "submitted", marks: 25, desc: "Implement linear regression from scratch using NumPy. Use the Boston Housing dataset." },
  { id: 3, title: "DBMS ER Diagram – E-commerce System", subject: "Database Systems", due: "Oct 18, 2026", status: "pending", marks: 15, desc: "Design an ER diagram for a full e-commerce application. Include at least 6 entities." },
  { id: 4, title: "Algo Design – Greedy Problem Set", subject: "Algorithm Design", due: "Oct 8, 2026", status: "overdue", marks: 20, desc: "Solve 5 greedy algorithm problems from the problem set. Show time complexity analysis." },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  pending:   { label: "Pending",   color: "#f59e0b", bg: "#f59e0b18", Icon: Clock },
  submitted: { label: "Submitted", color: "#10b981", bg: "#10b98118", Icon: CheckCircle2 },
  overdue:   { label: "Overdue",   color: "#ef4444", bg: "#ef444418", Icon: AlertCircle },
};

export default function AssignmentsView({ branding }: Props) {
  const [assignments, setAssignments] = useState(INITIAL);
  const [filter, setFilter] = useState("all");
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [file, setFile] = useState<string>("");
  const { toasts, toast, dismiss } = useToast();

  const filters = ["all", "pending", "submitted", "overdue"];
  const visible = filter === "all" ? assignments : assignments.filter(a => a.status === filter);

  const handleUpload = () => {
    if (!file.trim()) { toast("Please enter a file name.", "error"); return; }
    setAssignments(prev => prev.map(a => a.id === uploadId ? { ...a, status: "submitted" } : a));
    setUploadId(null);
    setFile("");
    toast("Assignment submitted successfully! ✅", "success");
  };

  const uploadTarget = assignments.find(a => a.id === uploadId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>📋 Assignments</h2>
        <div className="flex gap-2">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all active:scale-95"
              style={{ background: filter === f ? branding.accentColor : "var(--bg-card)", color: filter === f ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {visible.map(a => {
          const s = STATUS_META[a.status];
          return (
            <div key={a.id} className="interactive-card rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: s.bg, color: s.color }}>
                    <s.Icon size={11} /> {s.label}
                  </span>
                  <h3 className="mt-2 font-semibold" style={{ color: "var(--text-primary)" }}>{a.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{a.subject}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Due</p>
                  <p className="text-sm font-semibold" style={{ color: a.status === "overdue" ? "#ef4444" : "var(--text-primary)" }}>{a.due}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{a.marks} marks</p>
                </div>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{a.desc}</p>
              {a.status === "pending" && (
                <button
                  onClick={() => setUploadId(a.id)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: branding.accentColor }}
                >
                  <Upload size={14} /> Upload Submission
                </button>
              )}
              {a.status === "submitted" && (
                <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: "#10b981" }}>
                  <CheckCircle2 size={16} /> Submitted — awaiting marks
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      <Modal open={!!uploadTarget} onClose={() => { setUploadId(null); setFile(""); }} title="Submit Assignment" accent={branding.accentColor}>
        {uploadTarget && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{uploadTarget.title}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Due: {uploadTarget.due} · {uploadTarget.marks} marks</p>
            </div>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer hover:border-opacity-80"
              style={{ borderColor: branding.accentColor + "50", background: branding.accentColor + "05" }}
            >
              <Upload size={28} className="mx-auto mb-2" style={{ color: branding.accentColor }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Click to attach file</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>PDF, ZIP, DOCX up to 50 MB</p>
              <input
                type="text"
                placeholder="Or type your file name / Google Drive link..."
                value={file}
                onChange={e => setFile(e.target.value)}
                className="mt-3 w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setUploadId(null); setFile(""); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>Cancel</button>
              <button onClick={handleUpload} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2" style={{ background: branding.accentColor }}>
                <Upload size={14} /> Submit
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
