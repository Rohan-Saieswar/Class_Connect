
"use client";
import { useRouter } from "next/navigation";
import type { WorkspaceBranding } from "@/lib/branding";
import type { NavPage } from "./DashboardShell";
import { Home, Megaphone, Calendar, ClipboardList, BookOpen, Folder, MessageSquare, Star, BarChart2, ChevronLeft, ChevronRight, UserRound, UsersRound, GraduationCap } from "lucide-react";

interface Props {
  branding: WorkspaceBranding;
  section: string;
  activePage: NavPage;
  setActivePage: (p: NavPage) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  canManageMembers: boolean;
}

const navItems: { id: NavPage; label: string; Icon: React.ElementType }[] = [
  { id: "home",          label: "Dashboard",     Icon: Home },
  { id: "announcements", label: "Announcements",  Icon: Megaphone },
  { id: "timetable",     label: "Timetable",      Icon: Calendar },
  { id: "assignments",   label: "Assignments",    Icon: ClipboardList },
  { id: "exams",         label: "Examinations",   Icon: BookOpen },
  { id: "resources",     label: "Resources",      Icon: Folder },
  { id: "discussions",   label: "Discussions",    Icon: MessageSquare },
  { id: "events",        label: "Events",         Icon: Star },
  { id: "polls",         label: "Polls",          Icon: BarChart2 },
  { id: "profile",       label: "My profile",    Icon: UserRound },
  { id: "members",       label: "Manage members", Icon: UsersRound },
  { id: "classroom",    label: "Google Classroom", Icon: GraduationCap },
];

export default function Sidebar({ branding, section, activePage, setActivePage, isOpen, setIsOpen, canManageMembers }: Props) {
  const router = useRouter();
  return (
    <aside
      className="flex flex-col transition-all duration-300 ease-in-out relative flex-shrink-0"
      style={{
        width: isOpen ? "240px" : "72px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
          style={{ background: branding.accentColor }}
        >
          {branding.section}
        </div>
        {isOpen && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              {branding.name}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {branding.badgeText}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {navItems.filter(({ id }) => id !== "members" || canManageMembers).map(({ id, label, Icon }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => id === "classroom" ? router.push(`/class/${section.toLowerCase()}/classroom`) : setActivePage(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left"
              style={{
                background: active ? branding.accentColor + "20" : "transparent",
                color: active ? branding.accentColor : "var(--text-secondary)",
                fontWeight: active ? "600" : "400",
              }}
              title={!isOpen ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {isOpen && <span className="text-sm truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full flex items-center justify-center border shadow-sm transition-all hover:scale-110 z-10"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-muted)",
        }}
      >
        {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* Footer */}
      <div className="p-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        {isOpen ? (
          <div className="text-xs px-2" style={{ color: "var(--text-muted)" }}>
            <p className="font-medium">SRM University–AP</p>
            <p className="mt-0.5">Section-Connect v1.0</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>SC</span>
          </div>
        )}
      </div>
    </aside>
  );
}
