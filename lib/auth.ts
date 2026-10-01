import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./prisma";

export const ALLOWED_EMAIL_DOMAIN = "@srmap.edu.in";
const SESSION_COOKIE_NAME = "section_connect_session";
const SESSION_SECRET = process.env.AUTH_SECRET || (process.env.NODE_ENV === "production" ? "" : "section-connect-local-development-secret");

function getSessionSecret(): string {
  if (!SESSION_SECRET) {
    throw new Error("AUTH_SECRET must be configured in production.");
  }
  return SESSION_SECRET;
}

export interface SessionPayload {
  userId: string;
  email: string;
  globalRole: string; // USER, SYSTEM_ADMIN
  exp: number;
}

/**
 * STRICT SERVER-SIDE VALIDATION:
 * Only allows emails ending with @srmap.edu.in.
 * Rejects gmail.com, outlook.com, yahoo.com, icloud.com, etc.
 */
export function validateSrmEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const cleanEmail = email.trim().toLowerCase();
  return cleanEmail.endsWith(ALLOWED_EMAIL_DOMAIN) && cleanEmail.length > ALLOWED_EMAIL_DOMAIN.length;
}

/**
 * Fast and secure PBKDF2 / SHA-256 deterministic password hashing
 */
export function hashPassword(password: string): string {
  const salt = crypto.createHash("sha256").update(getSessionSecret()).digest("hex").slice(0, 16);
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Creates an encrypted/signed HMAC session token
 */
export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const data: SessionPayload = { ...payload, exp };
  const base64Data = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSessionSecret()).update(base64Data).digest("base64url");
  return `${base64Data}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  try {
    const [base64Data, signature] = token.split(".");
    const expectedSignature = crypto.createHmac("sha256", getSessionSecret()).update(base64Data).digest("base64url");
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;

    const data: SessionPayload = JSON.parse(Buffer.from(base64Data, "base64url").toString("utf8"));
    if (data.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently authenticated user from cookies, server-side.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        studentProfile: true,
        facultyProfile: true,
        userPreference: true,
        memberships: {
          include: {
            workspace: true,
          },
        },
      },
    });

    return user;
  } catch (err) {
    console.error("Error fetching current user:", err);
    return null;
  }
}

export { SESSION_COOKIE_NAME };
