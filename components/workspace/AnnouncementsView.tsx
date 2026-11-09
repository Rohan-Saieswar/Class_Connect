"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { WorkspaceBranding } from "@/lib/branding";
import Modal from "@/components/ui/Modal";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { Pin, Clock, CalendarDays, Pencil, Trash2 } from "lucide-react";

interface Props { branding: WorkspaceBranding; }

type Announcement = {
  id: string; title: string; content: string; category: string; priority: string;
  isPinned: boolean; publishedAt: string; eventDate: string | null; editedAt: string | null;
  authorId: string; authorName: string; authorRole: string; canEdit: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General", ACADEMIC: "Academic", EXAMINATION: "Exam", ASSIGNMENT: "Assignment",
  ATTENDANCE: "Attendance", EVENT: "Event", FACULTY: "Faculty", ADMINISTRATIVE: "Administrative", URGENT: "Urgent",
};
const PRIORITY_LABELS: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };
const ROLE_LABELS: Record<string, string> = { CR: "CR", FACULTY: "Faculty", STUDENT: "Student" };
const EMPTY_FORM = { title: "", content: "", category: "GENERAL", priority: "MEDIUM", isPinned: false, eventDate: "" };

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const fmtEventDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN");
}

export default function AnnouncementsView({ branding }: Props) {
  const params = useParams<{ workspace: string }>();
  const section = params?.workspace ?? "";

  const [items, setItems] = useState<Announcement[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { toasts, toast, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/${section}/announcements`, { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setItems(data.announcements);
      setCanPost(Boolean(data.canPost));
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => { load(); }, [load]);

  const categories = ["All", ...Array.from(new Set(items.map((a) => a.category)))];
  const filtered = filter === "All" ? items : items.filter((a) => a.category === filter);
  const detail = items.find((a) => a.id === detailId) || null;
  const label = (c: string) => (c === "All" ? "All" : CATEGORY_LABELS[c] ?? c);

  const openNew = () => { setEditingId(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({
      title: a.title, content: a.content, category: a.category, priority: a.priority,
      isPinned: a.isPinned, eventDate: a.eventDate ? a.eventDate.slice(0, 10) : "",
    });
    setDetailId(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast("Title and message are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, eventDate: form.eventDate || null };
      const res = await fetch(`/api/${section}/announcements`, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast(editingId ? (data.edited ? "Announcement updated." : "No changes to save.") : "Announcement posted!", "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this announcement?")) return;
    const res = await fetch(`/api/${section}/announcements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error || "Could not delete.", "error"); return; }
    setItems((prev) => prev.filter((a) => a.id !== id));
    setDetailId(null);
    toast("Announcement deleted.", "success");
  };

  const handlePin = async (a: Announcement) => {
    const res = await fetch(`/api/${section}/announcements`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, isPinned: !a.isPinned }),
    });
    if (!res.ok) { toast("Could not update.", "error"); return; }
    await load();
  };

  const inputStyle = { background: "var(--bg-primary)", border: "1px solid var(--border-medium)", color: "var(--text-primary)" };
  const labelStyle = { color: "var(--text-muted)" };
  const editedBadge = (a: Announcement) =>
    a.editedAt ? (
      <span className="inline-flex items-center gap-1 text-xs italic" style={{ color: "var(--text-muted)" }} title={`Edited ${fmtDay(a.editedAt)}, ${fmtTime(a.editedAt)}`}>
        <Pencil size={10} /> Edited
      </span>
    ) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>📢 Announcements</h2>
        {canPost && (
          <button
            onClick={openNew}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: branding.accentColor }}
          >
            + New
          </button>
        )}
      </div>

      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
              style={{ background: filter === c ? branding.accentColor : "var(--bg-card)", color: filter === c ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
            >{label(c)}</button>
          ))}
        </div>
      )}

      {loading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading announcements…</p>}

      {!loading && loadError && (
        <div className="rounded-2xl p-6 text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
          Couldn’t load announcements.{" "}
          <button onClick={() => { setLoading(true); load(); }} className="font-semibold underline">Try again</button>
        </div>
      )}

      {!loading && !loadError && filtered.length === 0 && (
        <div className="rounded-2xl p-10 text-center text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
          {items.length === 0
            ? canPost ? "No announcements yet. Post the first one with “+ New”." : "No announcements yet."
            : "No announcements match this filter."}
        </div>
      )}

      {filtered.map((a) => (
        <div
          key={a.id}
          className="interactive-card rounded-2xl p-6 cursor-pointer"
          style={{ background: "var(--bg-card)", border: a.isPinned ? `1px solid ${branding.accentColor}50` : "1px solid var(--border-subtle)" }}
          onClick={() => setDetailId(a.id)}
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {a.isPinned && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: branding.accentColor + "20", color: branding.accentColor }}><Pin size={10} /> Pinned</span>}
                <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}>{CATEGORY_LABELS[a.category] ?? a.category}</span>
                {(a.priority === "HIGH" || a.priority === "URGENT") && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: "#b91c1c20", color: "#b91c1c" }}>{PRIORITY_LABELS[a.priority]}</span>
                )}
                {editedBadge(a)}
              </div>
              <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{a.title}</h3>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <Clock size={11} />{timeAgo(a.publishedAt)}
              </span>
              {a.canEdit && (
                <button
                  type="button"
                  title="Delete announcement"
                  aria-label="Delete announcement"
                  onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                  className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
                  style={{ color: "#b91c1c" }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm leading-relaxed mb-3 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{a.content}</p>
          {a.eventDate && (
            <p className="text-xs font-medium mb-3 flex items-center gap-1.5" style={{ color: branding.accentColor }}>
              <CalendarDays size={12} /> {fmtEventDay(a.eventDate)}
            </p>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: branding.accentColor }}>{a.authorName[0]}</div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{a.authorName}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {ROLE_LABELS[a.authorRole] ?? a.authorRole} · {fmtDay(a.publishedAt)}, {fmtTime(a.publishedAt)}
              </p>
            </div>
          </div>
        </div>
      ))}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? "Edit Announcement" : "New Announcement"} accent={branding.accentColor}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Title *</label>
            <input value={form.title} maxLength={150} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. FIC 102 mid exam on Monday"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Message *</label>
            <textarea rows={4} value={form.content} maxLength={5000} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="Write your announcement..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Category</label>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                {Object.entries(CATEGORY_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Priority</label>
              <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                {Object.entries(PRIORITY_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Date it applies to (optional: exam, deadline, event)</label>
            <input type="date" value={form.eventDate} onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))} />
            Pin this announcement to the top
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setFormOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60" style={{ background: branding.accentColor }}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Post Announcement"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail?.title || ""} accent={branding.accentColor}>
        {detail && (
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: branding.accentColor + "20", color: branding.accentColor }}>{CATEGORY_LABELS[detail.category] ?? detail.category}</span>
              {(detail.priority === "HIGH" || detail.priority === "URGENT") && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: "#b91c1c20", color: "#b91c1c" }}>{PRIORITY_LABELS[detail.priority]}</span>
              )}
            </div>
            <div className="mb-4 rounded-xl p-3 text-xs space-y-1" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
              <p><span style={labelStyle}>Posted:</span> {fmtDay(detail.publishedAt)}, {fmtTime(detail.publishedAt)}</p>
              {detail.eventDate && <p><span style={labelStyle}>Applies to:</span> {fmtEventDay(detail.eventDate)}</p>}
              {detail.editedAt && <p><span style={labelStyle}>Edited:</span> {fmtDay(detail.editedAt)}, {fmtTime(detail.editedAt)}</p>}
            </div>
            <p className="text-sm leading-relaxed mb-5 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{detail.content}</p>
            <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: branding.accentColor }}>{detail.authorName[0]}</div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{detail.authorName}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ROLE_LABELS[detail.authorRole] ?? detail.authorRole}</p>
              </div>
              {detail.canEdit && (
                <div className="flex gap-2">
                  <button onClick={() => handlePin(detail)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                    {detail.isPinned ? "Unpin" : "Pin"}
                  </button>
                  <button onClick={() => openEdit(detail)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(detail.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: "#b91c1c" }}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}