
"use client";
import { useState, useEffect } from "react";
import type { WorkspaceBranding } from "@/lib/branding";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import DashboardHome from "@/components/workspace/DashboardHome";
import AnnouncementsView from "@/components/workspace/AnnouncementsView";
import TimetableView from "@/components/workspace/TimetableView";
import AssignmentsView from "@/components/workspace/AssignmentsView";
import ResourcesView from "@/components/workspace/ResourcesView";
import ExamsView from "@/components/workspace/ExamsView";
import ComingSoon from "@/components/workspace/ComingSoon";
import ProfileView from "@/components/workspace/ProfileView";
import MembersView from "@/components/workspace/MembersView";

interface Props {
  branding: WorkspaceBranding;
  section: string;
  profile: ProfileData;
}

export type NavPage =
  | "home" | "announcements" | "timetable" | "assignments"
  | "exams" | "resources" | "discussions" | "events" | "polls" | "profile" | "members" | "classroom";

export interface ProfileData {
  name: string;
  email: string;
  role: string;
  bio: string;
  skills: string;
  interests: string;
  github: string;
  linkedin: string;
  portfolio: string;
  isStudent: boolean;
  memberships: { section: string; name: string; displayName: string; role: string }[];
}

export default function DashboardShell({ branding, section, profile }: Props) {
  const [activePage, setActivePage] = useState<NavPage>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const dark = stored === "dark" || (stored === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const renderPage = () => {
    switch (activePage) {
      case "home":          return <DashboardHome branding={branding} navigate={setActivePage} section={section} />;
      case "announcements": return <AnnouncementsView branding={branding} />;
      case "timetable":     return <TimetableView branding={branding} />;
      case "assignments":   return <AssignmentsView branding={branding} />;
      case "exams":         return <ExamsView branding={branding} />;
      case "resources":     return <ResourcesView branding={branding} />;
      case "profile":       return <ProfileView profile={profile} />;
      case "members":       return <MembersView section={section} />;
      default:              return <ComingSoon branding={branding} page={activePage} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <Sidebar
        branding={branding}
        section={section}
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        canManageMembers={profile.role === "CR" || profile.role === "SYSTEM_ADMIN"}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar
          branding={branding}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDark={isDark}
          toggleTheme={toggleTheme}
          activePage={activePage}
          profile={profile}
          onOpenProfile={() => setActivePage("profile")}
        />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
