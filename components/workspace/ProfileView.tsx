"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Save, UserRound } from "lucide-react";
import type { ProfileData } from "@/components/layout/DashboardShell";

type EditableProfile = Pick<ProfileData, "name" | "bio" | "skills" | "interests" | "github" | "linkedin" | "portfolio">;

const inputClass = "mt-2 w-full border px-3 py-2.5 text-sm outline-none transition focus:border-[#842343] focus:ring-2 focus:ring-[#842343]/10";
const inputStyle = { background: "var(--bg-primary)", borderColor: "var(--border-medium)", color: "var(--text-primary)" };

export default function ProfileView({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [form, setForm] = useState<EditableProfile>({
    name: profile.name,
    bio: profile.bio,
    skills: profile.skills,
    interests: profile.interests,
    github: profile.github,
    linkedin: profile.linkedin,
    portfolio: profile.portfolio,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function update(field: keyof EditableProfile, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Your profile could not be saved.");
        return;
      }
      setMessage("Changes saved.");
      router.refresh();
    } catch {
      setMessage("We could not reach the profile service. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const labelClass = "text-sm font-medium";
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="border-b pb-5" style={{ borderColor: "var(--border-subtle)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#842343]">Account</p>
        <h2 className="mt-2 font-serif text-3xl" style={{ color: "var(--text-primary)" }}>My profile</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Your university identity and class memberships.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form onSubmit={saveProfile} className="space-y-6 border p-5 sm:p-7" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass} style={{ color: "var(--text-primary)" }}>
              Full name
              <input required minLength={2} maxLength={80} value={form.name} onChange={(event) => update("name", event.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className={labelClass} style={{ color: "var(--text-primary)" }}>
              University email
              <input value={profile.email} readOnly className={`${inputClass} cursor-not-allowed opacity-70`} style={inputStyle} />
            </label>
          </div>

          {profile.isStudent && (
            <>
              <label className={`${labelClass} block`} style={{ color: "var(--text-primary)" }}>
                About
                <textarea rows={3} maxLength={280} value={form.bio} onChange={(event) => update("bio", event.target.value)} className={`${inputClass} resize-y`} style={inputStyle} placeholder="A short introduction" />
                <span className="mt-1 block text-right text-xs font-normal" style={{ color: "var(--text-muted)" }}>{form.bio.length}/280</span>
              </label>
              <label className={`${labelClass} block`} style={{ color: "var(--text-primary)" }}>
                Skills
                <input maxLength={500} value={form.skills} onChange={(event) => update("skills", event.target.value)} className={inputClass} style={inputStyle} placeholder="Python, UI design, robotics" />
              </label>
            </>
          )}

          <label className={`${labelClass} block`} style={{ color: "var(--text-primary)" }}>
            {profile.isStudent ? "Academic interests" : "Research areas"}
            <textarea rows={2} maxLength={500} value={form.interests} onChange={(event) => update("interests", event.target.value)} className={`${inputClass} resize-y`} style={inputStyle} />
          </label>

          {profile.isStudent && (
            <div className="grid gap-5 sm:grid-cols-3">
              {(["github", "linkedin", "portfolio"] as const).map((field) => (
                <label key={field} className={labelClass} style={{ color: "var(--text-primary)" }}>
                  {field === "github" ? "GitHub" : field === "linkedin" ? "LinkedIn" : "Portfolio"}
                  <input type="url" value={form[field]} onChange={(event) => update(field, event.target.value)} className={inputClass} style={inputStyle} placeholder="https://" />
                </label>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5" style={{ borderColor: "var(--border-subtle)" }}>
            <p aria-live="polite" className="text-sm" style={{ color: message === "Changes saved." ? "#357451" : "var(--text-secondary)" }}>{message}</p>
            <button disabled={saving} className="inline-flex h-11 items-center gap-2 bg-[#842343] px-5 text-sm font-semibold text-white transition hover:bg-[#681a35] disabled:opacity-60">
              {message === "Changes saved." && !saving ? <Check size={16} /> : <Save size={16} />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          <section className="border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
            <div className="mb-4 grid h-12 w-12 place-items-center bg-[#842343]/10 text-[#842343]"><UserRound size={22} /></div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{profile.name}</h3>
            <p className="mt-1 break-all text-xs" style={{ color: "var(--text-muted)" }}>{profile.email}</p>
          </section>
          <section className="border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
            <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Class memberships</h3>
            <div className="space-y-3">
              {profile.memberships.map((membership) => (
                <a key={membership.section} href={`/${membership.section.toLowerCase()}`} className="block border-l-2 border-[#842343] py-1 pl-3">
                  <span className="block text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{membership.name}</span>
                  <span className="mt-0.5 block text-xs" style={{ color: "var(--text-secondary)" }}>{membership.displayName}</span>
                  <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-[#842343]">{membership.role}</span>
                </a>
              ))}
              {profile.memberships.length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>No active class memberships.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}