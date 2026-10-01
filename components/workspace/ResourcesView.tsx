
"use client";
import { useState } from "react";
import type { WorkspaceBranding } from "@/lib/branding";
import Modal from "@/components/ui/Modal";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { Download, Upload, Search, FileText } from "lucide-react";

interface Props { branding: WorkspaceBranding; }

const INITIAL = [
  { id: 1, name: "DS Notes – Unit 3 (Trees & Graphs)", subject: "Data Structures", type: "PDF", size: "2.4 MB", uploader: "Dr. K. Reddy", date: "Oct 2, 2026", url: "#" },
  { id: 2, name: "ML Chapter 5 – Neural Networks Slides", subject: "Machine Learning", type: "PPTX", size: "8.1 MB", uploader: "Prof. R. Sharma", date: "Oct 1, 2026", url: "#" },
  { id: 3, name: "SQL Practice Questions – Mid Sem", subject: "Database Systems", type: "PDF", size: "1.1 MB", uploader: "CR Team", date: "Sep 28, 2026", url: "#" },
  { id: 4, name: "Algo Design PYQs 2023–24", subject: "Algorithm Design", type: "PDF", size: "3.7 MB", uploader: "Senior Students", date: "Sep 25, 2026", url: "#" },
  { id: 5, name: "Python ML Starter Code", subject: "Machine Learning", type: "ZIP", size: "512 KB", uploader: "Prof. R. Sharma", date: "Sep 22, 2026", url: "#" },
];

const TYPE_COLORS: Record<string, string> = { PDF: "#ef4444", PPTX: "#f97316", ZIP: "#6366f1", DOC: "#3b82f6" };

export default function ResourcesView({ branding }: Props) {
  const [resources, setResources] = useState(INITIAL);
  const [search, setSearch] = useState("");
  const [uploadModal, setUploadModal] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", type: "PDF" });
  const { toasts, toast, dismiss } = useToast();

  const visible = resources.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.subject.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = (r: typeof INITIAL[0]) => {
    toast(`Downloading "${r.name}"...`, "info");
    // In production this would fetch a signed URL
    setTimeout(() => toast(`"${r.name}" downloaded! ✅`, "success"), 1500);
  };

  const handleUpload = () => {
    if (!form.name.trim() || !form.subject.trim()) { toast("Fill in all fields.", "error"); return; }
    setResources(prev => [{
      id: Date.now(), name: form.name, subject: form.subject,
      type: form.type, size: "—", uploader: "You", date: "Just now", url: "#"
    }, ...prev]);
    setForm({ name: "", subject: "", type: "PDF" });
    setUploadModal(false);
    toast("Resource uploaded successfully! 📁", "success");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>📁 Resources</h2>
        <button onClick={() => setUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: branding.accentColor }}>
          <Upload size={14} /> Upload
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input type="text" placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }} />
      </div>

      <div className="space-y-3">
        {visible.length === 0 && (
          <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>No resources match your search.</p>
          </div>
        )}
        {visible.map((r) => (
          <div key={r.id} className="interactive-card flex items-center gap-4 p-4 rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white flex-shrink-0" style={{ background: TYPE_COLORS[r.type] || "#6366f1" }}>
              {r.type}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{r.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{r.subject} · {r.size} · {r.date} · by {r.uploader}</p>
            </div>
            <button
              onClick={() => handleDownload(r)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 hover:opacity-90"
              style={{ background: branding.accentColor + "20", color: branding.accentColor }}
            >
              <Download size={12} /> Download
            </button>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      <Modal open={uploadModal} onClose={() => setUploadModal(false)} title="Upload Resource" accent={branding.accentColor}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>File / Resource Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. ML Chapter 6 Notes"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Subject *</label>
              <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="e.g. Machine Learning"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" }}>
                {["PDF", "PPTX", "ZIP", "DOC", "MP4", "Other"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="border-2 border-dashed rounded-xl p-6 text-center" style={{ borderColor: branding.accentColor + "40" }}>
            <Upload size={24} className="mx-auto mb-2" style={{ color: branding.accentColor }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Drag & drop or paste Google Drive link</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setUploadModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>Cancel</button>
            <button onClick={handleUpload} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: branding.accentColor }}>Upload Resource</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
