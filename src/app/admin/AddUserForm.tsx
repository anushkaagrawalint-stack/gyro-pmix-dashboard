"use client";

import { useActionState, useState } from "react";
import { createUserAction, type ActionState } from "./actions";

export default function AddUserForm({ locations }: { locations: readonly string[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createUserAction, undefined);
  const [role, setRole] = useState<"owner" | "manager">("manager");

  return (
    <form action={action} style={card}>
      <h3 style={h3}>Add a user</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>Name</label>
          <input name="name" placeholder="Jane Doe" style={inp} />
        </div>
        <div>
          <label style={lbl}>Email</label>
          <input name="email" type="email" placeholder="jane@kutlerri.ai" required style={inp} />
        </div>
        <div>
          <label style={lbl}>Role</label>
          <select name="role" value={role} onChange={(e) => setRole(e.target.value as "owner" | "manager")} style={inp}>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        <div>
          <label style={lbl}>Password</label>
          <input name="password" type="text" placeholder="min 4 characters" required style={inp} />
        </div>
      </div>

      {role === "manager" && (
        <div style={{ marginTop: 14 }}>
          <label style={lbl}>Locations this manager can view</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {locations.map((l) => (
              <label key={l} style={chk}>
                <input type="checkbox" name="locations" value={l} /> {l}
              </label>
            ))}
          </div>
        </div>
      )}
      {role === "owner" && (
        <p style={{ fontSize: 11.5, color: "var(--mu)", margin: "12px 0 0" }}>Owners see all locations and can manage users.</p>
      )}

      {state?.error && <p style={{ color: "#ef4444", fontSize: 12.5, margin: "12px 0 0" }}>{state.error}</p>}
      {state?.ok && <p style={{ color: "#10b981", fontSize: 12.5, margin: "12px 0 0" }}>{state.ok}</p>}

      <button type="submit" disabled={pending} style={{ ...btn, opacity: pending ? 0.7 : 1, marginTop: 16 }}>
        {pending ? "Adding…" : "Add user"}
      </button>
    </form>
  );
}

const card: React.CSSProperties = { background: "var(--sf)", border: "1px solid var(--ln)", borderRadius: 12, padding: 20, fontFamily: "var(--font-inter)" };
const h3: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: "0 0 16px" };
const lbl: React.CSSProperties = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--mu)", marginBottom: 6 };
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 13, color: "var(--ink)", background: "var(--bg)", border: "1px solid var(--ln)", borderRadius: 7, outline: "none", fontFamily: "var(--font-inter)" };
const chk: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink)", background: "var(--bg)", border: "1px solid var(--ln)", borderRadius: 7, padding: "5px 9px", cursor: "pointer" };
const btn: React.CSSProperties = { padding: "9px 16px", fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--ac)", border: "none", borderRadius: 8, cursor: "pointer" };
