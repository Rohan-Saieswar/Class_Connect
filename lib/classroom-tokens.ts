import "server-only";
import crypto from "crypto";

const TOKEN_VERSION = "v1";
const TOKEN_KEY_SALT = "section-connect-google-classroom-token-v1";

function getEncryptionKey(): Buffer {
  const secret = process.env.CLASSROOM_TOKEN_ENCRYPTION_KEY ||
    (process.env.NODE_ENV === "development" ? process.env.AUTH_SECRET : undefined);
  if (!secret) throw new Error("CLASSROOM_TOKEN_ENCRYPTION_KEY must be configured to protect Classroom tokens.");
  return crypto.scryptSync(secret, TOKEN_KEY_SALT, 32);
}

export function encryptClassroomToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [TOKEN_VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptClassroomToken(value: string): string {
  const [version, encodedIv, encodedTag, encodedData] = value.split(".");
  if (version !== TOKEN_VERSION || !encodedIv || !encodedTag || !encodedData) {
    throw new Error("Stored Classroom credential has an invalid encrypted format.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedData, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
