export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  console.info(
    [
      `GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID || "MISSING"}`,
      `GOOGLE_CLIENT_SECRET=${process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING"}`,
      `GOOGLE_REDIRECT_URI=${process.env.GOOGLE_REDIRECT_URI || "MISSING"}`,
      `NODE_ENV=${process.env.NODE_ENV || "MISSING"}`,
    ].join("\n"),
  );
}
