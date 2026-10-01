import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { createSessionToken, hashPassword, SESSION_COOKIE_NAME, validateSrmEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleRedirectUri, isGoogleOAuthConfigured, loginErrorRedirect } from "@/lib/google-oauth";

const OAUTH_COOKIE_NAMES = ["google_oauth_state", "google_oauth_nonce", "google_oauth_verifier", "google_oauth_next"];

function matchesSecret(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function clearOauthCookies(response: NextResponse) {
  for (const name of OAUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 0,
    });
  }
  return response;
}

function safeNextPath(value: string): string {
  return value === "/" || /^\/[a-z]$/i.test(value) ? value.toLowerCase() : "/";
}

async function findUserByEmailInsensitive(email: string) {
  const matches = await prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "User" WHERE LOWER("email") = LOWER(${email}) LIMIT 1`;
  if (!matches[0]) return null;
  return prisma.user.findUnique({ where: { id: matches[0].id } });
}

const SAFE_PROVIDER_ERRORS = new Set([
  "access_denied",
  "invalid_client",
  "invalid_grant",
  "invalid_request",
  "server_error",
  "temporarily_unavailable",
  "unauthorized_client",
]);

function safeErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { errorType: typeof error };

  const value = error as {
    name?: unknown;
    code?: unknown;
    status?: unknown;
    response?: { status?: unknown; data?: { error?: unknown } };
  };
  const details: Record<string, string | number> = {};
  if (typeof value.name === "string" && /^[A-Za-z]+Error$/.test(value.name)) details.errorType = value.name;
  if (typeof value.response?.data?.error === "string" && SAFE_PROVIDER_ERRORS.has(value.response.data.error)) {
    details.providerError = value.response.data.error;
  }
  const status = value.response?.status ?? value.status;
  if (typeof status === "number" && Number.isInteger(status)) details.httpStatus = status;
  if (typeof value.code === "string" && /^P\d{4}$/.test(value.code)) details.databaseCode = value.code;
  return details;
}

function logOAuthFailure(category: string, error?: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[Google OAuth] ${category}`, error === undefined ? {} : safeErrorDetails(error));
  }
}

function isInvalidOAuthClient(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { response?: { data?: { error?: unknown } } };
  return value.response?.data?.error === "invalid_client";
}

function fail(requestUrl: string, loginCode: string, category: string, error?: unknown) {
  logOAuthFailure(category, error);
  return loginErrorRedirect(requestUrl, loginCode);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");
  if (providerError) {
    const safeProviderError = providerError.replace(/[^a-z_]/gi, "").slice(0, 40);
    return clearOauthCookies(fail(request.url, "google_cancelled", "OAUTH_PROVIDER_REJECTED", {
      response: { data: { error: SAFE_PROVIDER_ERRORS.has(safeProviderError) ? safeProviderError : "" } },
    }));
  }

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieStore = await cookies();
  const state = cookieStore.get("google_oauth_state")?.value;
  const nonce = cookieStore.get("google_oauth_nonce")?.value;
  const verifier = cookieStore.get("google_oauth_verifier")?.value;
  const next = safeNextPath(cookieStore.get("google_oauth_next")?.value || "/");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !isGoogleOAuthConfigured()) {
    return clearOauthCookies(fail(request.url, "google_not_configured", "OAUTH_CONFIGURATION_FAILED"));
  }

  if (!code) return clearOauthCookies(fail(request.url, "google_invalid_response", "OAUTH_CODE_MISSING"));
  if (!returnedState || !state || !nonce || !verifier || !matchesSecret(returnedState, state)) {
    return clearOauthCookies(fail(request.url, "google_state_invalid", "INVALID_STATE"));
  }

  const redirectUri = getGoogleRedirectUri(request.url);
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);
  let idToken: string | undefined;
  try {
    const { tokens } = await client.getToken({ code, codeVerifier: verifier, redirect_uri: redirectUri });
    idToken = tokens.id_token ?? undefined;
  } catch (error) {
    const invalidClient = isInvalidOAuthClient(error);
    return clearOauthCookies(fail(
      request.url,
      invalidClient ? "google_client_credentials_rejected" : "google_token_exchange_failed",
      invalidClient ? "OAUTH_CLIENT_CREDENTIALS_REJECTED" : "OAUTH_TOKEN_EXCHANGE_FAILED",
      error,
    ));
  }

  if (!idToken) return clearOauthCookies(fail(request.url, "google_token_exchange_failed", "OAUTH_TOKEN_EXCHANGE_FAILED"));

  let identity;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    identity = ticket.getPayload();
  } catch (error) {
    return clearOauthCookies(fail(request.url, "google_profile_failed", "GOOGLE_PROFILE_FAILED", error));
  }

  if (!identity?.email || identity.email_verified !== true) {
    return clearOauthCookies(fail(request.url, "google_profile_failed", "GOOGLE_PROFILE_FAILED"));
  }
  const email = identity.email.trim().toLowerCase();
  if (!validateSrmEmail(email)) {
    return clearOauthCookies(fail(request.url, "google_domain_rejected", "EMAIL_DOMAIN_REJECTED"));
  }
  if (!identity.nonce || !matchesSecret(identity.nonce, nonce)) {
    return clearOauthCookies(fail(request.url, "google_state_invalid", "INVALID_STATE"));
  }

  let user;
  try {
    const existingUser = await findUserByEmailInsensitive(email);
    user = existingUser
      ? await prisma.user.update({ where: { id: existingUser.id }, data: { isVerified: true } })
      : await prisma.user.create({
          data: {
            email,
            name: identity.name?.trim() || email.split("@")[0],
            passwordHash: hashPassword(crypto.randomBytes(32).toString("base64url")),
            isVerified: true,
            userPreference: { create: { language: "en", theme: "system" } },
          },
        });
  } catch (error) {
    return clearOauthCookies(fail(request.url, "google_user_database_failed", "USER_DATABASE_FAILED", error));
  }

  let memberships;
  try {
    memberships = await prisma.workspaceMembership.findMany({
      where: { userId: user.id, status: "APPROVED", workspace: { status: "ACTIVE" } },
      include: { workspace: true },
      orderBy: { joinedAt: "asc" },
    });
  } catch (error) {
    return clearOauthCookies(fail(request.url, "google_membership_check_failed", "MEMBERSHIP_CHECK_FAILED", error));
  }

  const sectionMatch = next.match(/^\/([a-z])$/i);
  const requestedSection = next === "/" ? undefined : sectionMatch?.[1]?.toUpperCase();
  const membership = requestedSection
    ? memberships.find((item) => item.workspace.section.toUpperCase() === requestedSection)
    : memberships[0];

  if (!membership && user.globalRole !== "SYSTEM_ADMIN") {
    return clearOauthCookies(fail(request.url, "membership_required", "WORKSPACE_MEMBERSHIP_REQUIRED"));
  }

  let redirectTo = membership ? `/${membership.workspace.section.toLowerCase()}` : "/";
  if (!membership && user.globalRole === "SYSTEM_ADMIN") {
    try {
      const workspace = requestedSection
        ? await prisma.workspace.findFirst({ where: { section: requestedSection, status: "ACTIVE" } })
        : await prisma.workspace.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
      if (!workspace) return clearOauthCookies(fail(request.url, "membership_required", "WORKSPACE_MEMBERSHIP_REQUIRED"));
      redirectTo = `/${workspace.section.toLowerCase()}`;
    } catch (error) {
      return clearOauthCookies(fail(request.url, "google_membership_check_failed", "MEMBERSHIP_CHECK_FAILED", error));
    }
  }

  try {
    const response = clearOauthCookies(NextResponse.redirect(new URL(redirectTo, request.url)));
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken({
      userId: user.id,
      email: user.email,
      globalRole: user.globalRole,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    return clearOauthCookies(fail(request.url, "google_session_failed", "SESSION_CREATION_FAILED", error));
  }
}