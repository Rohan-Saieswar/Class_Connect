
"use client";
import type { WorkspaceBranding } from "@/lib/branding";
import type { NavPage } from "@/components/layout/DashboardShell";
import { ArrowRight, Megaphone, Calendar, ClipboardList, MessageSquare } from "lucide-react";
import GoogleClassroomWidget from "@/components/workspace/GoogleClassroomWidget";

interface Props {
  branding: WorkspaceBranding;
  navigate: (page: NavPage) => void;
  section: string;
}

const recentActivity = [
  { text: "Prof. Sharma posted: Mid-sem syllabus update", time: "2m ago", emoji: "📢", page: "announcements" as NavPage },
  { text: "New assignment: DS Lab 4 – Graph Traversals", time: "1h ago", emoji: "📋", page: "assignments" as NavPage },
  { text: "Exam schedule released for Unit 3", time: "3h ago", emoji: "📝", page: "exams" as NavPage },
  { text: "New resource: ML Notes Chapter 5 uploaded", time: "5h ago", emoji: "📁", page: "resources" as NavPage },
  { text: "Class cancelled tomorrow – Algo class", time: "Yesterday", emoji: "⚠️", page: "announcements" as NavPage },
];

const quickLinks: { label: string; desc: string; page: NavPage; Icon: React.ElementType }[] = [
  { label: "Announcements",  desc: "See latest notices",        page: "announcements", Icon: Megaphone },
  { label: "Timetable",      desc: "View class schedule",       page: "timetable",     Icon: Calendar },
  { label: "Assignments",    desc: "Track your submissions",    page: "assignments",   Icon: ClipboardList },
  { label: "Discussions",    desc: "Join class conversations",  page: "discussions",   Icon: MessageSquare },
];

export default function DashboardHome({ branding, navigate, section }: Props) {
  const stats = [
    { label: "Announcements", value: "12", emoji: "📢", delta: "+2 today",    page: "announcements" as NavPage },
    { label: "Assignments",   value: "4",  emoji: "📋", delta: "2 due soon",  page: "assignments"   as NavPage },
    { label: "Upcoming Exams",value: "3",  emoji: "📝", delta: "Next: Mon",   page: "exams"         as NavPage },
    { label: "Resources",     value: "38", emoji: "📁", delta: "+5 this week",page: "resources"     as NavPage },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <div
        className="rounded-2xl p-8 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${branding.accentColor}22 0%, ${branding.accentColor}06 100%)`,
          border: `1px solid ${branding.accentColor}30`,
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg" style={{ background: branding.accentColor }}>
              {branding.section}
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ background: branding.accentColor }}>
              {branding.badgeText}
            </span>
          </div>
          <h2 className="text-3xl font-bold mt-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            Welcome to {branding.name} 👋
          </h2>
          <p className="mt-1 text-base" style={{ color: "var(--text-secondary)" }}>{branding.displayName}</p>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{branding.subheading}</p>
        </div>
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-10" style={{ background: branding.accentColor }} />
      </div>

      {/* Stats — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => navigate(s.page)}
            className="interactive-card rounded-2xl p-5 text-left transition-all group"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="text-3xl mb-3">{s.emoji}</div>
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</div>
            <div className="text-sm font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>{s.label}</div>
            <div className="text-xs mt-1 flex items-center gap-1" style={{ color: branding.accentColor }}>
              {s.delta}
              <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      <GoogleClassroomWidget section={section} />

      {/* Quick links + Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Quick Actions</h3>
          <div className="space-y-2">
            {quickLinks.map(({ label, desc, page, Icon }) => (
              <button
                key={label}
                onClick={() => navigate(page)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group hover:shadow-sm"
                style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}
              >
                <Icon size={18} style={{ color: branding.accentColor }} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: branding.accentColor }} />
              </button>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Recent Activity</h3>
          <div className="space-y-1">
            {recentActivity.map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.page)}
                className="w-full flex items-start gap-3 py-2.5 px-2 rounded-xl transition-all text-left group border-b last:border-0 hover:bg-opacity-50"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: "var(--text-primary)" }}>{item.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.time}</p>
                </div>
                <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" style={{ color: branding.accentColor }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
