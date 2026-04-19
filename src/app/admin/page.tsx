import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const metadata = {
  title: "Admin · Favorites",
};

export default function AdminPage() {
  if (process.env.VERCEL) redirect("/");

  return (
    <div style={{ background: "var(--bg)", minHeight: "calc(100dvh - 52px)" }}>
      <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>Admin</span>
        <span style={{ color: "var(--text-3)", fontSize: 12 }}>/</span>
        <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>Favorite Films</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(232,130,161,0.8)", fontWeight: 600, background: "rgba(232,130,161,0.1)", border: "1px solid rgba(232,130,161,0.25)", borderRadius: 4, padding: "2px 8px" }}>
          LOCALHOST ONLY
        </span>
      </div>
      <AdminClient />
    </div>
  );
}
