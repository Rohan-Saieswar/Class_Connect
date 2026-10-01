
"use client";
import { useState } from "react";
import type { WorkspaceBranding } from "@/lib/branding";
import Modal from "@/components/ui/Modal";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { Pin, Clock, User } from "lucide-react";

interface Props { branding: WorkspaceBranding; }

const INITIAL = [
  {
    id: 1, title: "Mid-Semester Exam Schedule Released",
    body: "The mid-semester examinations will begin from October 15th. Check the detailed schedule on the Exams page. All students are required to carry their ID cards.",
    author: "Prof. R. Sharma", role: "Faculty", subject: "Academics", time: "2 hours ago", pinned: true, tags: ["Exam", "Important"],
  },
  {
    id: 2, title: "DS Lab Assignment 4 – Graph Algorithms",
    body: "Assignment 4 on Graph Traversal (BFS & DFS) has been uploaded. Submission deadline is October 12th, 11:59 PM. Late submissions will not be accepted.",
    author: "Dr. K. Reddy", role: "Faculty", subject: "DS Lab", time: "5 hours ago", pinned: false, tags: ["Assignment"],
  },
  {
    id: 3, title: "Section J Class Representative Election",
    body: "Nominations for CR and Deputy CR are open. Submit your nomination by filling the Google Form shared in WhatsApp group before October 10th.",
    author: "CR Team", role: "CR", subject: "General", time: "1 day ago", pinned: false, tags: ["General"],
  },
  {
    id: 4, title: "ML Workshop – Register Now (Free)",
    body: "A free Machine Learning hands-on workshop will be held on October 20th. Open to CSE AI&ML students. Limited seats – register via the Events page.",
    author: "Tech Club", role: "Club", subject: "Workshop", time: "2 days ago", pinned: false, tags: ["Event", "ML"],
  },
];

export default function AnnouncementsView({ branding }: Props) {
  const [announcements, setAnnouncements] = useState(INITIAL);
  const [filter, setFilter] = useState("All");
  const [newModal, setNewModal] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", body: "", subject: "General", tags: "General" });
  const { toasts, toast, dismiss } = useToast();

  const tags = ["All", "Exam", "Assignment", "General", "Event", "ML"];
  const filtered = filter === "All" ? announcements : announcements.filter(a => a.tags.includes(filter));
  const detail = announcements.find(a => a.id === detailId) || null;

  const handlePost = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast("Title and body are required.", "error");
      return;
    }
    const next = {
      id: Date.now(), title: form.title, body: form.body,
      author: "You", role: "Student", subject: form.subject,
      time: "Just now", pinned: false,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
    };
    setAnnouncements(prev => [next, ...prev]);
    setForm({ title: "", body: "", subject: "General", tags: "General" });
    setNewModal(false);
    toast("Announcement posted!", "success");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>📢 Announcements</h2>
        <button
          onClick={() => setNewModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: branding.accentColor }}
        >
          + New
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {tags.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
            style={{ background: filter === t ? branding.accentColor : "var(--bg-card)", color: filter === t ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >{t}</button>
        ))}
      </div>

      {/* Cards */}
      {filtered.map(a => (
        <div
          key={a.id}
          className="interactive-card rounded-2xl p-6 cursor-pointer"
          style={{ background: "var(--bg-card)", border: a.pinned ? `1px solid ${branding.accentColor}50` : "1px solid var(--border-subtle)" }}
          onClick={() => setDetailId(a.id)}
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {a.pinned && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: branding.accentColor + "20", color: branding.accentColor }}><Pin size={10} /> Pinned</span>}
                {a.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}>{t}</span>)}
              </div>
              <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{a.title}</h3>
            </div>
            <span className="text-xs flex-shrink-0 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <Clock size={11} />{a.time}
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-4 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{a.body}</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: branding.accentColor }}>{a.author[0]}</div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{a.author}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.role} · {a.subject}</p>
            </div>
          </div>
        </div>
      ))}

      {/* New Announcement Modal */}
      <Modal open={newModal} onClose={() => setNewModal(false)} title="New Announcement" accent={branding.accentColor}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Assignment deadline extended"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Message *</label>
            <textarea rows={4} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              placeholder="Write your announcement..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Subject</label>
              <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Tags (comma separated)</label>
              <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                placeholder="General, Exam, Event"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" }} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setNewModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>Cancel</button>
            <button onClick={handlePost} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: branding.accentColor }}>Post Announcement</button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail?.title || ""} accent={branding.accentColor}>
        {detail && (
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {detail.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-md" style={{ background: branding.accentColor + "20", color: branding.accentColor }}>{t}</span>)}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{detail.time}</span>
            </div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>{detail.body}</p>
            <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: branding.accentColor }}>{detail.author[0]}</div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{detail.author}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{detail.role} · {detail.subject}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
