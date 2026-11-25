"use client";

import { useEffect, useState } from "react";
import { logout } from "@/app/actions/auth";

type Props = {
  user: { name: string; email: string; role: "admin" | "owner" | "manager" };
  canAdmin: boolean;
};

// The dashboard engine renders into #app itself (ported prototype), so React never renders children inside #app.
export default function DashboardClient({ user, canAdmin }: Props) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        const { startDashboard } = await import("@/dashboard/engine");
        if (!alive) return;
        // let the engine's sidebar show the Admin link for admin/owner
        (window as unknown as { __gyroCanAdmin?: boolean }).__gyroCanAdmin = canAdmin;
        startDashboard(data);
        setStatus("ready");
      } catch (e) {
        if (!alive) return;
        setMessage(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    })();
    return () => { alive = false; };
  }, []);

  const roleLabel = user.role === "manager" ? "Store Manager" : user.role[0].toUpperCase() + user.role.slice(1);

  return (
    <>
      {status === "loading" && <div className="boot">Loading Product Mix data…</div>}
      {status === "error" && <div className="boot err">Could not load the dashboard: {message}</div>}
      <div id="app" suppressHydrationWarning />
      <div id="toast" />
      <div id="tip" />

      {/* user chip — floats bottom-right, non-invasive over the engine UI */}
      <div
        style={{
          position: "fixed",
          right: 14,
          bottom: 14,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 10px 7px 12px",
          background: "var(--sf)",
          border: "1px solid var(--ln)",
          borderRadius: 999,
          boxShadow: "0 6px 20px rgba(0,0,0,.18)",
          fontFamily: "var(--font-inter)",
          fontSize: 12,
        }}
      >
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontWeight: 700, color: "var(--ink)" }}>{user.name}</div>
          <div style={{ color: "var(--mu)", fontSize: 10.5 }}>{roleLabel}</div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            style={{ fontSize: 11.5, fontWeight: 600, color: "var(--mu)", background: "transparent", border: "1px solid var(--ln)", borderRadius: 7, padding: "4px 8px", cursor: "pointer" }}
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
