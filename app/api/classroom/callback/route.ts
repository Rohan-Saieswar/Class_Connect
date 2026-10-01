import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClassroomOAuthClient, getClassroomRedirectUri } from "@/lib/google-classroom";
import { encryptClassroomToken } from "@/lib/classroom-tokens";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncClassroomConnection } from "@/lib/google-classroom-sync";

const COOKIE_NAMES = [
  "classroom_oauth_state",
  "classroom_oauth_nonce",
  "classroom_oauth_verifier",
  "classroom_oauth_workspace",
];

function safeEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function clearCookies(response: NextResponse) {
  for (const name of COOKIE_NAMES) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/classroom",
      maxAge: 0,
    });
  }
  return response;
}

function pageRedirect(requestUrl: string, section: string, status: string) {
  return new URL(`/class/${encodeURIComponent(section.toLowerCase())}/classroom?connection=${encodeURIComponent(status)}`, requestUrl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const section = cookieStore.get("classroom_oauth_workspace")?.value;
  const finish = (status: string) => clearCookies(NextResponse.redirect(pageRedirect(request.url, section || "j", status)));
  if (!section) return clearCookies(NextResponse.redirect(new URL("/login", request.url)));

  const providerError = url.searchParams.get("error");
  if (providerError) return finish(providerError === "access_denied" ? "cancelled" : "oauth_failed");

  const user = await getCurrentUser();
  if (!user) return finish("login_required");

  const [code, returnedState] = [url.searchParams.get("code"), url.searchParams.get("state")];
  const state = cookieStore.get("classroom_oauth_state")?.value;
  const nonce = cookieStore.get("classroom_oauth_nonce")?.value;
  const verifier = cookieStore.get("classroom_oauth_verifier")?.value;
  if (!code || !returnedState || !state || !nonce || !verifier || !safeEqual(returnedState, state)) {
    return finish("invalid_state");
  }

  const workspace = await prisma.workspace.findFirst({
    where: { section: section.toUpperCase(), status: "ACTIVE" },
  });
  if (!workspace) return finish("workspace_unavailable");
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
  });
  if (!membership || membership.status !== "APPROVED") return finish("membership_required");

  try {
    const client = createClassroomOAuthClient();
    const redirectUri = getClassroomRedirectUri();
    const { tokens } = await client.getToken({ code, codeVerifier: verifier, redirect_uri: redirectUri });
    if (!tokens.id_token) return finish("identity_missing");

    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const identity = ticket.getPayload();
    if (!identity?.sub || !identity.email || identity.email_verified !== true || !identity.nonce || !safeEqual(identity.nonce, nonce)) {
      return finish("identity_invalid");
    }

    const existing = await prisma.googleClassroomUserConnection.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    });
    if (!tokens.refresh_token && (!existing?.encryptedRefreshToken || existing.googleSubjectId !== identity.sub)) {
      return finish("refresh_token_missing");
    }

    const connection = await prisma.googleClassroomUserConnection.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        googleSubjectId: identity.sub,
        googleEmail: identity.email.trim().toLowerCase(),
        status: "SYNCING",
        encryptedAccessToken: tokens.access_token ? encryptClassroomToken(tokens.access_token) : null,
        encryptedRefreshToken: tokens.refresh_token ? encryptClassroomToken(tokens.refresh_token) : existing?.encryptedRefreshToken ?? null,
        accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        grantedScopesJson: JSON.stringify(tokens.scope?.split(" ") ?? []),
        disconnectedAt: null,
      },
      update: {
        googleSubjectId: identity.sub,
        googleEmail: identity.email.trim().toLowerCase(),
        status: "SYNCING",
        encryptedAccessToken: tokens.access_token ? encryptClassroomToken(tokens.access_token) : existing?.encryptedAccessToken ?? null,
        encryptedRefreshToken: tokens.refresh_token ? encryptClassroomToken(tokens.refresh_token) : existing?.encryptedRefreshToken ?? null,
        accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        grantedScopesJson: JSON.stringify(tokens.scope?.split(" ") ?? []),
        disconnectedAt: null,
      },
    });

    try {
      await syncClassroomConnection(connection);
    } catch (syncError) {
      const syncCode = syncError instanceof Error ? syncError.message : "CLASSROOM_SYNC_FAILED";
      return finish(syncCode === "REAUTH_REQUIRED" ? "reauth_required" : "initial_sync_failed");
    }

    return finish("connected");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (process.env.NODE_ENV === "development") {
      console.error("[GOOGLE_CLASSROOM_CONNECT_FAILED]", { errorCode: /^[A-Z0-9_]+$/.test(code) ? code : "UNCLASSIFIED" });
    }
    return finish("connect_failed");
  }
}
