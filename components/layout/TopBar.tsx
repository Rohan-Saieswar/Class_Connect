
"use client";
import { useRouter } from "next/navigation";
import type { WorkspaceBranding } from "@/lib/branding";
import type { NavPage } from "./DashboardShell";
import type { ProfileData } from "./DashboardShell";
import { Menu, Sun, Moon, Bell, UserCircle, LogOut } from "lucide-react";

interface Props {
  branding: WorkspaceBranding;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  isDark: boolean;
  toggleTheme: () => void;
  activePage: NavPage;
  profile: ProfileData;
  onOpenProfile: () => void;
}

const pageTitles: Record<NavPage, string> = {
  home: "Dashboard",
  announcements: "Announcements",
  timetable: "Class Timetable",
  assignments: "Assignments",
  exams: "Examinations",
  resources: "Resources",
  discussions: "Discussions",
  events: "Events",
  polls: "Polls",
  profile: "My profile",
  members: "Manage members",
  classroom: "Google Classroom",
};

export default function TopBar({ branding, sidebarOpen, setSidebarOpen, isDark, toggleTheme, activePage, profile, onOpenProfile }: Props) {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            {pageTitles[activePage]}
          </h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {branding.displayName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
          style={{ background: branding.accentColor }}
        >
          {branding.badgeText}
        </span>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)", background: "var(--bg-primary)" }}
          title="Toggle theme"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="p-2 rounded-lg relative transition-colors"
          style={{ color: "var(--text-muted)", background: "var(--bg-primary)" }}
        >
          <Bell size={18} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: branding.accentColor }}
          />
        </button>

        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 px-3 py-1.5 transition-colors"
          style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}
          aria-label="Open profile"
        >
          <UserCircle size={18} />
          <span className="hidden max-w-32 truncate sm:block text-sm font-medium">{profile.name}</span>
        </button>
        <button onClick={signOut} className="p-2 transition-colors" style={{ color: "var(--text-muted)" }} title="Sign out" aria-label="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
