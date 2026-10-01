import "server-only";
import { OAuth2Client } from "google-auth-library";
import type { GoogleClassroomUserConnection } from "@prisma/client";
import { decryptClassroomToken, encryptClassroomToken } from "@/lib/classroom-tokens";
import { prisma } from "@/lib/prisma";

export const GOOGLE_CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
  "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
  "https://www.googleapis.com/auth/classroom.topics.readonly",
];

export function getClassroomRedirectUri(): string {
  const redirectUri = process.env.GOOGLE_CLASSROOM_REDIRECT_URI;
  if (!redirectUri) throw new Error("GOOGLE_CLASSROOM_REDIRECT_URI is required.");
  return redirectUri;
}

export function createClassroomOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || clientSecret === "YOUR_CLIENT_SECRET" || clientSecret === "YOUR_NEW_SECRET_HERE") {
    throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  }
  return new OAuth2Client(clientId, clientSecret, getClassroomRedirectUri());
}

export function createConnectedClassroomClient(connection: GoogleClassroomUserConnection): OAuth2Client {
  if (!new Set(["CONNECTED", "SYNCING", "SYNC_FAILED"]).has(connection.status) || !connection.encryptedRefreshToken) {
    throw new Error("CLASSROOM_REAUTH_REQUIRED");
  }

  const client = createClassroomOAuthClient();
  client.setCredentials({
    refresh_token: decryptClassroomToken(connection.encryptedRefreshToken),
    access_token: connection.encryptedAccessToken
      ? decryptClassroomToken(connection.encryptedAccessToken)
      : undefined,
    expiry_date: connection.accessTokenExpiresAt?.getTime(),
  });

  client.on("tokens", (tokens) => {
    const encryptedAccessToken = tokens.access_token ? encryptClassroomToken(tokens.access_token) : undefined;
    const encryptedRefreshToken = tokens.refresh_token ? encryptClassroomToken(tokens.refresh_token) : undefined;
    if (!encryptedAccessToken && !encryptedRefreshToken) return;

    void prisma.googleClassroomUserConnection.update({
      where: { id: connection.id },
      data: {
        ...(encryptedAccessToken ? { encryptedAccessToken } : {}),
        ...(encryptedRefreshToken ? { encryptedRefreshToken } : {}),
        ...(tokens.expiry_date ? { accessTokenExpiresAt: new Date(tokens.expiry_date) } : {}),
      },
    }).catch(() => undefined);
  });
  return client;
}

export async function classroomApiGet<T>(client: OAuth2Client, resourcePath: string): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await client.request<T>({
        url: `https://classroom.googleapis.com/v1/${resourcePath}`,
        method: "GET",
      });
      return response.data;
    } catch (error) {
      const status = error && typeof error === "object" && "response" in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      if (![429, 500, 503].includes(status ?? 0) || attempt >= 4) throw error;
      const delay = Math.min(1000 * 2 ** attempt, 10000) + Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
