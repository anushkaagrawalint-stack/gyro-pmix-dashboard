"use client";

import { useActionState, useState } from "react";
import { updateUserAction, deleteUserAction, type ActionState } from "./actions";

type U = { id: string; name: string; email: string; role: "admin" | "owner" | "manager"; locations: string[] };
const ROLE_COLOR: Record<string, string> = { admin: "#9f7cef", owner: "#2563eb", manager: "#10b981" };

export default function UserRow({
  user,
  you,
  canEdit,
  canDelete,
  locations,
}: {
  user: U;
  you: boolean;
  canEdit: boolean;
  canDelete: boolean;
  locations: readonly string[];
}) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<"owner" | "manager">(user.role === "owner" ? "owner" : "manager");
  const [state, action, pending] = useActionState<ActionState, FormData>(updateUserAction, undefined);

  if (!editing) {
    return (
      <tr style={{ borderTop: "1px solid var(--ln)", verticalAlign: "middle" }}>
        <td style={td}><b>{user.name}</b>{you && <span style={{ color: "var(--mu)", fontWeight: 400 }}> · you</span>}</td>
        <td style={td}>{user.email}</td>
        <td style={td}><span style={badge(user.role)}>{user.role}</span></td>
        <td style={td}>
          {user.role !== "manager" ? <span style={{ color: "var(--mu)" }}>All locations</span>
            : <span style={{ fontSize: 12 }}>{user.locations.length ? user.locations.join(", ") : <i style={{ color: "var(--mu)" }}>none</i>}</span>}
        </td>
        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
          {canEdit && <button onClick={() => setEditing(true)} style={editBtn}>Edit</button>}
          {canDelete ? (
            <form action={deleteUserAction} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={user.id} />
              <button style={delBtn}>Delete</button>
            </form>
          ) : (!canEdit && <span style={{ color: "var(--mu)", fontSize: 11 }}>—</span>)}
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderTop: "1px solid var(--ln)", background: "var(--bg)" }}>
      <td colSpan={5} style={{ padding: 14 }}>
        <form action={action} style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="id" value={user.id} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 150px 1fr", gap: 10 }}>
            <Field label="Name"><input name="name" defaultValue={user.name} style={inp} /></Field>
            <Field label="Email"><input name="email" type="email" defaultValue={user.email} style={inp} /></Field>
            <Field label="Role">
              <select name="role" value={role} onChange={(e) => setRole(e.target.value as "owner" | "manager")} style={inp}>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </Field>
            <Field label="New password (blank = keep)"><input name="password" type="text" placeholder="unchanged" style={inp} /></Field>
          </div>
          {role === "manager" && (
            <Field label="Locations this manager can view">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {locations.map((l) => (
                  <label key={l} style={chk}>
                    <input type="checkbox" name="locations" value={l} defaultChecked={user.locations.includes(l)} /> {l}
                  </label>
                ))}
              </div>
            </Field>
          )}
          {state?.error && <p style={{ color: "#ef4444", fontSize: 12.5, margin: 0 }}>{state.error}</p>}
          {state?.ok && <p style={{ color: "#10b981", fontSize: 12.5, margin: 0 }}>{state.ok}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={pending} style={{ ...editBtn, background: "var(--ac)", color: "#fff", border: "none", opacity: pending ? 0.7 : 1 }}>{pending ? "Saving…" : "Save changes"}</button>
            <button type="button" onClick={() => setEditing(false)} style={editBtn}>Cancel</button>
          </div>
        </form>
      </td>
    </tr>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={lbl}>{label}</label>{children}</div>;
}
const badge = (r: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color: ROLE_COLOR[r], background: (ROLE_COLOR[r] ?? "#888") + "22", padding: "2px 8px", borderRadius: 999 });
const td: React.CSSProperties = { padding: "10px" };
const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--mu)", marginBottom: 5 };
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "7px 9px", fontSize: 13, color: "var(--ink)", background: "var(--sf)", border: "1px solid var(--ln)", borderRadius: 7, outline: "none", fontFamily: "var(--font-inter)" };
const chk: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink)", background: "var(--sf)", border: "1px solid var(--ln)", borderRadius: 6, padding: "4px 8px", cursor: "pointer" };
const editBtn: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: "var(--ink)", background: "transparent", border: "1px solid var(--ln)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", marginLeft: 6 };
const delBtn: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: "#ef4444", background: "transparent", border: "1px solid #ef444455", borderRadius: 6, padding: "4px 10px", cursor: "pointer", marginLeft: 6 };
