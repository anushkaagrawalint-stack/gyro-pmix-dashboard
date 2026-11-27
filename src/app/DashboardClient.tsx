"use client";

import { useEffect, useState } from "react";

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
        // user name + role for the sidebar footer (where Sign out now lives)
        (window as unknown as { __gyroUser?: { name: string; role: string } }).__gyroUser = {
          name: user.name,
          role: user.role === "manager" ? "Store Manager" : user.role[0].toUpperCase() + user.role.slice(1),
        };
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

  return (
    <>
      {status === "loading" && <div className="boot">Loading Product Mix data…</div>}
      {status === "error" && <div className="boot err">Could not load the dashboard: {message}</div>}
      <div id="app" suppressHydrationWarning />
      <div id="toast" />
      <div id="tip" />
      {/* user info + Sign out now live in the engine sidebar footer (see sidebar() in engine.js) */}
    </>
  );
}
