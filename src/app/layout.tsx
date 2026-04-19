import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";

export const generateMetadata = async (): Promise<Metadata> => {
  const user = process.env.LETTERBOXD_USER || "you";
  return {
    title: `${user} · Film Diary & Stats`,
    description: `${user}'s film diary — monthly watch calendar, watching insights, and lifetime stats.`,
    keywords: ["film diary", user, "movies", "stats", "calendar", "insights", "watch history"],
    openGraph: {
      title: `${user} · Film Diary & Stats`,
      description: `Film diary and stats for ${user}.`,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${user} · Film Diary & Stats`,
      description: `Film diary and stats for ${user}.`,
    },
  };
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Suspense fallback={<div style={{ height: 52 }} />}>
          <Header />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
