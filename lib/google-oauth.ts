import { NextResponse } from "next/server";

export function isGoogleOAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return Boolean(clientId && clientSecret && clientSecret !== "YOUR_NEW_SECRET_HERE");
}

export function getGoogleRedirectUri(requestUrl: string): string {
  return process.env.GOOGLE_REDIRECT_URI || new URL("/api/auth/google/callback", requestUrl).toString();
}

export function loginErrorRedirect(requestUrl: string, error: string) {
  const login = new URL("/login", requestUrl);
  login.searchParams.set("error", error);
  return NextResponse.redirect(login);
}