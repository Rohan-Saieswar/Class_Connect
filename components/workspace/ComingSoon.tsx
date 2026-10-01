
import type { WorkspaceBranding } from "@/lib/branding";
import type { NavPage } from "@/components/layout/DashboardShell";

const PAGE_INFO: Record<string, { emoji: string; desc: string }> = {
  discussions: { emoji: "💬", desc: "Live class discussions and Q&A threads" },
  events:      { emoji: "⭐", desc: "Class events, workshops and meetups" },
  polls:       { emoji: "📊", desc: "Class polls and quick votes" },
};

export default function ComingSoon({ branding, page }: { branding: WorkspaceBranding; page: NavPage }) {
  const info = PAGE_INFO[page] || { emoji: "🚧", desc: "This feature is coming soon" };
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-6xl mb-4">{info.emoji}</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          {page.charAt(0).toUpperCase() + page.slice(1)}
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{info.desc}</p>
        <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: branding.accentColor + "20", color: branding.accentColor }}>
          Coming soon to {branding.name}
        </span>
      </div>
    </div>
  );
}
