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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ac)" }} />
          <h1 style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)", margin: 0 }}>Gyro Republic</h1>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--mu)", margin: "0 0 20px" }}>Product Mix · sign in to continue</p>

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
