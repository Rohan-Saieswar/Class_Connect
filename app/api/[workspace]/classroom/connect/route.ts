import crypto from "crypto";
import { NextResponse } from "next/server";
import { CodeChallengeMethod } from "google-auth-library";
import { getClassroomContext } from "@/lib/classroom-access";
import { createClassroomOAuthClient, GOOGLE_CLASSROOM_SCOPES } from "@/lib/google-classroom";

const COOKIE_PATH = "/api/classroom";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: COOKIE_PATH,
  maxAge: 600,
};

export async function GET(request: Request, { params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: section } = await params;
  const context = await getClassroomContext(section);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

  let client;
  try {
    client = createClassroomOAuthClient();
  } catch {
    return NextResponse.redirect(new URL(`/class/${section}/classroom?error=classroom_not_configured`, request.url));
  }

  const state = crypto.randomBytes(32).toString("base64url");
  const nonce = crypto.randomBytes(32).toString("base64url");
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const authorizationUrl = client.generateAuthUrl({
    redirect_uri: process.env.GOOGLE_CLASSROOM_REDIRECT_URI,
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    response_type: "code",
    scope: ["openid", "email", "profile", ...GOOGLE_CLASSROOM_SCOPES],
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: CodeChallengeMethod.S256,
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("classroom_oauth_state", state, COOKIE_OPTIONS);
  response.cookies.set("classroom_oauth_nonce", nonce, COOKIE_OPTIONS);
  response.cookies.set("classroom_oauth_verifier", verifier, COOKIE_OPTIONS);
  response.cookies.set("classroom_oauth_workspace", context.workspace.section, COOKIE_OPTIONS);
  return response;
}
