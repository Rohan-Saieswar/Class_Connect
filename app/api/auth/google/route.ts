import crypto from "crypto";
import { NextResponse } from "next/server";
import { getGoogleRedirectUri, isGoogleOAuthConfigured, loginErrorRedirect } from "@/lib/google-oauth";

const OAUTH_COOKIE_PATH = "/api/auth/google";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: OAUTH_COOKIE_PATH,
  maxAge: 600,
};

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !isGoogleOAuthConfigured()) return loginErrorRedirect(request.url, "google_not_configured");

  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const safeNext = next === "/" || /^\/[a-z]$/i.test(next) ? next.toLowerCase() : "/";
  const state = crypto.randomBytes(32).toString("base64url");
  const nonce = crypto.randomBytes(32).toString("base64url");
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");

  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", getGoogleRedirectUri(request.url));
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("nonce", nonce);
  authorizationUrl.searchParams.set("code_challenge", challenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("hd", "srmap.edu.in");
  authorizationUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("google_oauth_state", state, COOKIE_OPTIONS);
  response.cookies.set("google_oauth_nonce", nonce, COOKIE_OPTIONS);
  response.cookies.set("google_oauth_verifier", verifier, COOKIE_OPTIONS);
  response.cookies.set("google_oauth_next", safeNext, COOKIE_OPTIONS);
  return response;
}