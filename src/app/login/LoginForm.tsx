"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 24 }}>
      <form
        action={action}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "var(--sf)",
          border: "1px solid var(--ln)",
          borderRadius: 12,
          padding: 28,
          boxShadow: "0 10px 40px rgba(0,0,0,.25)",
          fontFamily: "var(--font-inter)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gyro-logo.webp" alt="Gyro Republic" style={{ height: 64, width: "auto" }} />
          <p style={{ fontSize: 12.5, color: "var(--mu)", margin: "14px 0 0", textAlign: "center" }}>Product Mix · sign in to continue</p>
        </div>

        <input type="hidden" name="next" value={next} />

        <label style={labelStyle}>Email</label>
        <input name="email" type="email" autoComplete="username" placeholder="you@kutlerri.ai" required style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 14 }}>Password</label>
        <input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required style={inputStyle} />

        {state?.error && (
          <p style={{ color: "#ef4444", fontSize: 12.5, margin: "14px 0 0" }}>{state.error}</p>
        )}

        <button type="submit" disabled={pending} style={{ ...buttonStyle, opacity: pending ? 0.7 : 1 }}>
          {pending ? "Signing in…" : "Sign in"}
        </button>

        <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid var(--ln)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--mu)" }}>Powered by</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="k-light" src="/kutlerri-logo-dark.webp" alt="Kutlerri" style={{ height: 17, width: "auto" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="k-dark" src="/kutlerri-logo.webp" alt="Kutlerri" style={{ height: 17, width: "auto" }} />
        </div>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: ".04em",
  color: "var(--mu)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  fontSize: 14,
  color: "var(--ink)",
  background: "var(--bg)",
  border: "1px solid var(--ln)",
  borderRadius: 8,
  outline: "none",
  fontFamily: "var(--font-inter)",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 22,
  padding: "11px 12px",
  fontSize: 14,
  fontWeight: 700,
  color: "#fff",
  background: "var(--ac)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};
