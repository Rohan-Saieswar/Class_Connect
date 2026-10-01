import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Section-Connect | University Class Portal",
  description: "The digital operating system for SRM University-AP classes. Centralize announcements, assignments, timetables, resources and more.",
  keywords: ["SRM University", "class portal", "section connect", "CSE", "AI ML", "academics"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Merriweather:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem("theme") || "light";
                if (t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
                  document.documentElement.classList.add("dark");
                }
              } catch(e) {
                document.documentElement.classList.add("dark");
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
