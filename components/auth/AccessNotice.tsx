"use client";

import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function AccessNotice({ section }: { section: string }) {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f5f1] px-6 text-[#252321]">
      <section className="w-full max-w-lg border border-[#e3ded6] bg-white p-8 sm:p-10">
        <div className="mb-6 grid h-11 w-11 place-items-center bg-[#842343]/10 text-[#842343]"><LockKeyhole size={20} /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#842343]">Workspace access</p>
        <h1 className="mt-3 font-serif text-3xl">Membership required</h1>
        <p className="mt-3 text-sm leading-6 text-[#77716b]">Your account is not an approved member of Section {section}. Ask a class representative to approve your membership.</p>
        <button onClick={signOut} className="mt-7 bg-[#842343] px-5 py-3 text-sm font-semibold text-white hover:bg-[#681a35]">Sign out</button>
      </section>
    </main>
  );
}