import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="text-center">
        <div className="text-8xl font-bold mb-4" style={{ color: "var(--brand-color, #842343)" }}>404</div>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Workspace Not Found</h1>
        <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
          This section workspace doesn't exist or you don't have access.
        </p>
        <Link
          href="/login"
          className="px-6 py-3 rounded-xl text-white font-medium transition-all"
          style={{ background: "#842343" }}
        >
          Return to sign in
        </Link>
      </div>
    </div>
  );
}
