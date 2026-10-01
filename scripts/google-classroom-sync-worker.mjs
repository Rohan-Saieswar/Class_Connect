const baseUrl = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
const secret = process.env.CRON_SECRET;
const intervalSeconds = Number(process.env.CLASSROOM_SYNC_INTERVAL_SECONDS || "900");

if (!baseUrl) {
  console.error("APP_BASE_URL must be set before starting the Classroom sync worker.");
  process.exit(1);
}
if (!secret) {
  console.error("CRON_SECRET must be set before starting the Classroom sync worker.");
  process.exit(1);
}
if (!Number.isFinite(intervalSeconds) || intervalSeconds < 60) {
  console.error("CLASSROOM_SYNC_INTERVAL_SECONDS must be at least 60.");
  process.exit(1);
}

async function runSync() {
  try {
    const response = await fetch(`${baseUrl}/api/internal/google-classroom-sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(120000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error(`[Classroom sync worker] request failed: status=${response.status}`);
      return;
    }
    console.info(`[Classroom sync worker] processed=${result.processed ?? 0} succeeded=${result.succeeded ?? 0} failed=${result.failed ?? 0}`);
  } catch (error) {
    const code = error && typeof error === "object" && "name" in error ? String(error.name) : "UnknownError";
    console.error(`[Classroom sync worker] request failed: ${/^[A-Za-z]+$/.test(code) ? code : "UnknownError"}`);
  }
}

console.info(`[Classroom sync worker] interval=${intervalSeconds}s`);
await runSync();
setInterval(() => void runSync(), intervalSeconds * 1000);
