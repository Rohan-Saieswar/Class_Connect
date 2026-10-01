"use client";

import { ShieldCheck } from "lucide-react";

const errorMessages: Record<string, string> = {
  google_not_configured: "Google sign-in is not configured. Add the OAuth client credentials to the server environment.",
  google_cancelled: "Google sign-in was cancelled.",
  google_invalid_response: "Google returned an incomplete sign-in response. Please try again.",
  google_state_invalid: "This sign-in request expired or could not be verified. Please start again.",
  google_client_credentials_rejected: "Google rejected the OAuth client credentials. Confirm the client ID and secret are from the same existing Web application client, then restart the server.",
  google_token_exchange_failed: "Google could not complete the authorization-code exchange. Check the server OAuth configuration and try again.",
  google_profile_failed: "Google sign-in succeeded, but the verified account profile could not be read.",
  google_domain_rejected: "Sign in with a verified @srmap.edu.in Google account.",
  google_user_database_failed: "Your Google account was verified, but the account could not be saved. Please try again.",
  google_membership_check_failed: "Your Google account was verified, but class access could not be checked. Please try again.",
  google_session_failed: "Your account was verified, but a sign-in session could not be created.",
  google_domain_required: "Sign in with a verified @srmap.edu.in Google account.",
  membership_required: "Your SRM account is recognized, but you need an approved class membership before you can enter a workspace.",
  google_sign_in_failed: "Google sign-in could not be completed. Please try again.",
};

export default function LoginForm({ next, errorCode }: { next: string; errorCode?: string }) {
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  const error = errorCode ? errorMessages[errorCode] : "";

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-[#252321] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.82fr)]">
      <section className="relative flex min-h-[290px] flex-col justify-between overflow-hidden bg-[#7a1f3d] px-7 py-8 text-white sm:px-12 sm:py-10 lg:min-h-screen lg:px-16 lg:py-14">
        <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -right-12 top-[30%] h-56 w-56 rounded-full border border-[#d8b36a]/30" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center border border-[#dfbd76]/70 text-sm font-bold tracking-wide text-[#f0d69a]">SRM</div>
          <div>
            <p className="text-sm font-semibold tracking-wide">SRM UNIVERSITY–AP</p>
            <p className="mt-0.5 text-xs text-white/65">Amaravati, Andhra Pradesh</p>
          </div>
        </div>
        <div className="relative z-10 max-w-xl py-10 lg:py-0">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#e6c77f]">The class, connected</p>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">Your academic life,<br />in one place.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/75 sm:text-base">
            A dedicated space for your class announcements, schedule, assignments, and the people you learn with.
          </p>
        </div>
        <div className="relative z-10 hidden items-center gap-2 text-xs text-white/60 lg:flex">
          <span className="h-px w-8 bg-[#d8b36a]" />
          <span>One university. Every class. Your community.</span>
        </div>
      </section>

      <section className="flex min-h-[calc(100vh-290px)] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-screen lg:px-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-9 lg:mb-12">
            <p className="text-sm font-semibold text-[#8a2445]">SECTION-CONNECT</p>
            <h2 className="mt-3 font-serif text-3xl text-[#252321] sm:text-4xl">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-[#77716b]">Continue with your SRM University–AP Google account.</p>
          </div>

          {error && <p role="alert" className="mb-4 border-l-2 border-[#a3324d] bg-[#a3324d]/5 px-3 py-2 text-sm leading-5 text-[#8a2445]">{error}</p>}

          <a
            href={`/api/auth/google${query}`}
            className="flex h-12 w-full items-center justify-center gap-3 border border-[#dedbd5] bg-white px-4 text-sm font-semibold text-[#393633] transition hover:border-[#b9b1a8] hover:bg-[#fcfbf9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#842343]"
          >
            <span className="font-bold text-lg text-[#4285f4]" aria-hidden="true">G</span>
            Continue with Google
          </a>

          <div className="mt-7 flex items-start gap-3 border-t border-[#e5e1db] pt-5 text-xs leading-5 text-[#79736d]">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#8a2445]" />
            <p>Access is limited to verified <span className="font-medium text-[#4b4641]">@srmap.edu.in</span> accounts with an approved class membership.</p>
          </div>
          <p className="mt-6 text-center text-xs text-[#938c85]">Need access? Contact your class representative.</p>
        </div>
      </section>
    </main>
  );
}