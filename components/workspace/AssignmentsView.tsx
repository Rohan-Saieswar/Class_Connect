"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { WorkspaceBranding } from "@/lib/branding";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { Calendar, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";

interface Props { branding: WorkspaceBranding; }

export default function AssignmentsView({ branding }: Props) {
  const params = useParams<{ workspace: string }>();
  const section = params?.workspace ?? "";

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<any>(null);
  const { toasts, toast, dismiss } = useToast();

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/${section}/classroom/data`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load classroom data");
      const json = await res.json();
      setData(json);
    } catch (e) {
      toast("Could not load classroom assignments.", "error");
    } finally {
      setLoading(false);
    }
  }, [section, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/${section}/classroom`, { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      toast("Google Classroom synchronized successfully!", "success");
      await loadData();
    } catch (e) {
      toast("Sync failed. Check connection.", "error");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading assignments...</div>;
  }

  const isConnected = data?.connectionStatus === "CONNECTED";
  const coursework = data?.coursework || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>📋 Assignments</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Synced directly from your Google Classroom</p>
        </div>
        {isConnected && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: branding.accentColor }}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        )}
      </div>

      {!isConnected ? (
        <div className="rounded-2xl p-10 text-center space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <AlertCircle size={32} className="mx-auto" style={{ color: branding.accentColor }} />
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Google Classroom Not Connected</h3>
          <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
            Connect your personal SRM Google Classroom account to view your assignments and deadlines here.
          </p>
          <a
            href={`/class/${section}/classroom`}
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: branding.accentColor }}
          >
            Go to Classroom Settings
          </a>
        </div>
      ) : coursework.length === 0 ? (
        <div className="rounded-2xl p-10 text-center text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
          🎉 No coursework found in your connected Google Classroom. You're all caught up!
        </div>
      ) : (
        <div className="space-y-4">
          {coursework.map((item: any) => (
            <div
              key={item.id}
              className="rounded-2xl p-6 transition-all"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <span className="text-xs px-2 py-0.5 rounded-md mb-2 inline-block" style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}>
                    {item.courseName || "Classroom Assignment"}
                  </span>
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
                </div>
                {item.alternateLink && (
                  <a
                    href={item.alternateLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                    style={{ background: branding.accentColor + "15", color: branding.accentColor }}
                  >
                    Open <ExternalLink size={12} />
                  </a>
                )}
              </div>
              {item.description && (
                <p className="text-sm leading-relaxed mb-4 line-clamp-3" style={{ color: "var(--text-secondary)" }}>
                  {item.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs pt-3 border-t" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
                <span>Max Points: {item.maxPoints ?? "Unrated"}</span>
                {item.dueDate ? (
                  <span className="flex items-center gap-1 font-medium" style={{ color: branding.accentColor }}>
                    <Calendar size={12} /> Due: {new Date(item.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                ) : (
                  <span>No due date</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}