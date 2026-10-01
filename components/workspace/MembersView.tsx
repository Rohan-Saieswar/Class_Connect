"use client";

import { useState, type FormEvent } from "react";
import { UserPlus, UsersRound } from "lucide-react";

interface Props {
  section: string;
}

export default function MembersView({ section }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"STUDENT" | "FACULTY">("STUDENT");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function approveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setSuccess(false);
    try {
      const response = await fetch(`/api/${encodeURIComponent(section)}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "The member could not be approved.");
        return;
      }
      setSuccess(true);
      setMessage(`${name} was approved as ${role.toLowerCase()}. They can sign in with their verified SRM Google account.`);
      setName("");
      setEmail("");
    } catch {
      setMessage("The membership service could not be reached. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-2 h-11 w-full border px-3 text-sm outline-none focus:border-[#842343] focus:ring-2 focus:ring-[#842343]/10";
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="border-b pb-5" style={{ borderColor: "var(--border-subtle)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#842343]">Workspace administration</p>
        <h2 className="mt-2 font-serif text-3xl" style={{ color: "var(--text-primary)" }}>Manage members</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Approve students and faculty for this class. University email and workspace membership are checked on the server.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form onSubmit={approveMember} className="space-y-5 border p-5 sm:p-7" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Full name
              <input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} style={{ background: "var(--bg-primary)", borderColor: "var(--border-medium)", color: "var(--text-primary)" }} />
            </label>
            <label className="block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              SRM email
              <input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@srmap.edu.in" className={inputClass} style={{ background: "var(--bg-primary)", borderColor: "var(--border-medium)", color: "var(--text-primary)" }} />
            </label>
          </div>
          <fieldset>
            <legend className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Workspace role</legend>
            <div className="mt-2 inline-flex border" style={{ borderColor: "var(--border-medium)" }}>
              {(["STUDENT", "FACULTY"] as const).map((option) => (
                <button key={option} type="button" onClick={() => setRole(option)} className="px-4 py-2 text-sm font-medium" style={{ color: role === option ? "white" : "var(--text-secondary)", background: role === option ? "#842343" : "var(--bg-primary)" }} aria-pressed={role === option}>
                  {option === "STUDENT" ? "Student" : "Faculty"}
                </button>
              ))}
            </div>
          </fieldset>
          {message && <p role={success ? "status" : "alert"} className="border-l-2 px-3 py-2 text-sm leading-5" style={{ borderColor: success ? "#357451" : "#a3324d", color: success ? "#357451" : "#8a2445", background: success ? "#3574510d" : "#a3324d0d" }}>{message}</p>}
          <button disabled={saving} className="inline-flex h-11 items-center gap-2 bg-[#842343] px-5 text-sm font-semibold text-white hover:bg-[#681a35] disabled:opacity-60">
            <UserPlus size={16} />
            {saving ? "Approving…" : "Approve member"}
          </button>
        </form>

        <aside className="border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <UsersRound size={21} className="mb-4 text-[#842343]" />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Workspace-scoped access</h3>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>Approvals apply only to this workspace. An SRM email alone never grants access to a class.</p>
          <p className="mt-4 border-t pt-4 text-xs leading-5" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>The invitee must sign in using the matching verified @srmap.edu.in Google account.</p>
        </aside>
      </div>
    </div>
  );
}