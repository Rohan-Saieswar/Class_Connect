"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import type { WorkspaceBranding } from "@/lib/branding";
import Modal from "@/components/ui/Modal";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { Pin, Clock, Trash2, AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  branding: WorkspaceBranding;
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  subject: string;
}

const CATEGORIES = [
  "GENERAL",
  "ACADEMIC",
  "EXAMINATION",
  "ASSIGNMENT",
  "ATTENDANCE",
  "EVENT",
  "FACULTY",
  "ADMINISTRATIVE",
  "URGENT",
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Just now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export default function AnnouncementsView({ branding }: Props) {
  const params = useParams();
  const rawWorkspace = params?.workspace;
  const workspace =
    typeof rawWorkspace === "string"
      ? rawWorkspace
      : Array.isArray(rawWorkspace)
        ? rawWorkspace[0]
        : "";

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canPost, setCanPost] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [filter, setFilter] = useState("All");
  const [newModal, setNewModal] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "GENERAL",
    priority: "MEDIUM",
    isPinned: false,
  });

  const { toasts, toast, dismiss } = useToast();

  const loadAnnouncements = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/${encodeURIComponent(workspace)}/announcements`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load announcements.");
      }
      setAnnouncements(data.announcements || []);
      setCanPost(Boolean(data.canPost));
      setCanManage(Boolean(data.canManage));
      setCurrentUserId(data.currentUserId || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load announcements.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  const categories = useMemo(() => {
    const activeCategories = Array.from(
      new Set(announcements.map((a) => a.category).filter(Boolean)),
    );
    return ["All", ...activeCategories];
  }, [announcements]);

  const filtered = useMemo(() => {
    if (filter === "All") return announcements;
    return announcements.filter((a) => a.category === filter);
  }, [announcements, filter]);

  const detail = useMemo(
    () => announcements.find((a) => a.id === detailId) || null,
    [announcements, detailId],
  );

  const handlePost = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast("Title and content are required.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/${encodeURIComponent(workspace)}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          category: form.category,
          priority: form.priority,
          isPinned: form.isPinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post announcement.");
      }
      setForm({
        title: "",
        content: "",
        category: "GENERAL",
        priority: "MEDIUM",
        isPinned: false,
      });
      setNewModal(false);
      toast("Announcement posted!", "success");
      await loadAnnouncements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post announcement.";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (
    e: React.MouseEvent,
    id: string,
    currentPinned: boolean,
  ) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/${encodeURIComponent(workspace)}/announcements`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPinned: !currentPinned }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update pin state.");
      }
      setAnnouncements((prev) =>
        prev
          .map((a) => (a.id === id ? { ...a, isPinned: !currentPinned } : a))
          .sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return (
              new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
            );
          }),
      );
      toast(
        !currentPinned ? "Announcement pinned!" : "Announcement unpinned!",
        "success",
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update pin.";
      toast(msg, "error");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await fetch(
        `/api/${encodeURIComponent(workspace)}/announcements?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete announcement.");
      }
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      if (detailId === id) setDetailId(null);
      toast("Announcement deleted.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete announcement.";
      toast(msg, "error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          📢 Announcements
        </h2>
        {canPost && (
          <button
            onClick={() => setNewModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: branding.accentColor }}
          >
            + New
          </button>
        )}
      </div>

      {/* Filters */}
      {!loading && !error && announcements.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
              style={{
                background: filter === t ? branding.accentColor : "var(--bg-card)",
                color: filter === t ? "#fff" : "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-4" aria-label="Loading announcements">
          {[1, 2, 3].map((key) => (
            <div
              key={key}
              className="rounded-2xl p-6 border animate-pulse"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/4 mb-3" />
              <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          className="rounded-2xl p-8 border text-center space-y-4"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex justify-center text-red-500">
            <AlertCircle size={32} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {error}
          </p>
          <button
            onClick={() => void loadAnnouncements()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: branding.accentColor }}
          >
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div
          className="rounded-2xl p-12 border text-center"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            No announcements yet
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {filter !== "All"
              ? `No announcements under category "${filter}".`
              : "Check back later for updates from your CRs and faculty."}
          </p>
        </div>
      )}

      {/* Cards list */}
      {!loading &&
        !error &&
        filtered.map((a) => {
          const canDeleteThis = canPost && (canManage || a.authorId === currentUserId);
          return (
            <div
              key={a.id}
              className="interactive-card rounded-2xl p-6 cursor-pointer"
              style={{
                background: "var(--bg-card)",
                border: a.isPinned
                  ? `1px solid ${branding.accentColor}50`
                  : "1px solid var(--border-subtle)",
              }}
              onClick={() => setDetailId(a.id)}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {a.isPinned && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md"
                        style={{
                          background: branding.accentColor + "20",
                          color: branding.accentColor,
                        }}
                      >
                        <Pin size={10} /> Pinned
                      </span>
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-md uppercase font-medium"
                      style={{
                        background: "var(--bg-primary)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {a.category}
                    </span>
                    {a.priority !== "MEDIUM" && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          a.priority === "URGENT" || a.priority === "HIGH"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {a.priority}
                      </span>
                    )}
                  </div>
                  <h3
                    className="text-base font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {a.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-xs flex items-center gap-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Clock size={11} />
                    {getRelativeTime(a.publishedAt)}
                  </span>
                  {canPost && (
                    <button
                      onClick={(e) => handleTogglePin(e, a.id, a.isPinned)}
                      title={a.isPinned ? "Unpin announcement" : "Pin announcement"}
                      className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs"
                      style={{
                        color: a.isPinned
                          ? branding.accentColor
                          : "var(--text-secondary)",
                      }}
                    >
                      <Pin size={14} className={a.isPinned ? "fill-current" : ""} />
                    </button>
                  )}
                  {canDeleteThis && (
                    <button
                      onClick={(e) => handleDelete(e, a.id)}
                      title="Delete announcement"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-all text-xs"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <p
                className="text-sm leading-relaxed mb-4 line-clamp-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {a.content}
              </p>

              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: branding.accentColor }}
                >
                  {a.authorName ? a.authorName[0]?.toUpperCase() : "U"}
                </div>
                <div>
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {a.authorName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {a.authorRole} · {a.subject}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

      {/* New Announcement Modal */}
      <Modal
        open={newModal}
        onClose={() => setNewModal(false)}
        title="New Announcement"
        accent={branding.accentColor}
      >
        <div className="space-y-4">
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Title *
            </label>
            <input
              value={form.title}
              maxLength={150}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Assignment deadline extended"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-medium)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Content *
            </label>
            <textarea
              rows={4}
              maxLength={5000}
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="Write your announcement..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-medium)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-medium)",
                  color: "var(--text-primary)",
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-medium)",
                  color: "var(--text-primary)",
                }}
              >
                {PRIORITIES.map((pri) => (
                  <option key={pri} value={pri}>
                    {pri}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="pin-to-top"
              checked={form.isPinned}
              onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))}
              className="rounded"
            />
            <label
              htmlFor="pin-to-top"
              className="text-xs font-medium cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
            >
              Pin to top
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setNewModal(false)}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "var(--bg-primary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => void handlePost()}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: branding.accentColor }}
            >
              {submitting ? "Posting..." : "Post Announcement"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetailId(null)}
        title={detail?.title || ""}
        accent={branding.accentColor}
      >
        {detail && (
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span
                className="text-xs px-2 py-0.5 rounded-md uppercase font-semibold"
                style={{
                  background: branding.accentColor + "20",
                  color: branding.accentColor,
                }}
              >
                {detail.category}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                  detail.priority === "URGENT" || detail.priority === "HIGH"
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}
              >
                {detail.priority}
              </span>
              {detail.isPinned && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md"
                  style={{
                    background: branding.accentColor + "20",
                    color: branding.accentColor,
                  }}
                >
                  <Pin size={10} /> Pinned
                </span>
              )}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {getRelativeTime(detail.publishedAt)}
              </span>
            </div>

            <p
              className="text-sm leading-relaxed mb-5 whitespace-pre-wrap"
              style={{ color: "var(--text-secondary)" }}
            >
              {detail.content}
            </p>

            <div
              className="flex items-center justify-between pt-4 border-t"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: branding.accentColor }}
                >
                  {detail.authorName ? detail.authorName[0]?.toUpperCase() : "U"}
                </div>
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {detail.authorName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {detail.authorRole} · {detail.subject}
                  </p>
                </div>
              </div>

              {canPost &&
                (canManage || detail.authorId === currentUserId) && (
                  <button
                    onClick={(e) => handleDelete(e, detail.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
