import { Suspense } from "react";
import { requireRole, visibleUsers, canDeleteUser, canEditManagerLocations } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { LOCATIONS } from "@/lib/locations";
import { logout } from "@/app/actions/auth";
import { deleteUserAction, setLocationsAction } from "./actions";
import AddUserForm from "./AddUserForm";

export const metadata = { title: "Admin · Gyro Republic" };

const ROLE_COLOR: Record<string, string> = { admin: "#9f7cef", owner: "#2563eb", manager: "#10b981" };

export default function AdminPage() {
  // Session read behind a Suspense boundary (Cache Components requirement).
  return (
    <Suspense fallback={<div style={{ padding: 24, fontFamily: "var(--font-inter)", color: "var(--mu)" }}>Loading…</div>}>
      <AdminBody />
    </Suspense>
  );
}

async function AdminBody() {
  const viewer = await requireRole(["admin", "owner"]);
  const users = visibleUsers(viewer, await listUsers());
  const canEditLoc = canEditManagerLocations(viewer.role);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", fontFamily: "var(--font-inter)", color: "var(--ink)" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: "1px solid var(--ln)", background: "var(--sf)" }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ac)" }} />
        <h1 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Admin · User management</h1>
        <span style={{ fontSize: 11.5, color: "var(--mu)" }}>signed in as {viewer.name} ({viewer.role})</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <a href="/" style={navLink}>← Dashboard</a>
          <form action={logout}><button style={navLink as React.CSSProperties}>Sign out</button></form>
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 22px", display: "grid", gap: 22 }}>
        <section style={card}>
          <h3 style={h3}>Users</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--mu)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Role</th>
                  <th style={th}>Locations</th>
                  <th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderTop: "1px solid var(--ln)", verticalAlign: "top" }}>
                    <td style={td}><b>{u.name}</b>{u.id === viewer.id && <span style={{ color: "var(--mu)", fontWeight: 400 }}> · you</span>}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLOR[u.role], background: (ROLE_COLOR[u.role] ?? "#888") + "22", padding: "2px 8px", borderRadius: 999 }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={td}>
                      {u.role !== "manager" ? (
                        <span style={{ color: "var(--mu)" }}>All locations</span>
                      ) : canEditLoc ? (
                        <form action={setLocationsAction} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", maxWidth: 420 }}>
                          <input type="hidden" name="id" value={u.id} />
                          {LOCATIONS.map((l) => (
                            <label key={l} style={chk}>
                              <input type="checkbox" name="locations" value={l} defaultChecked={u.locations.includes(l)} /> {l}
                            </label>
                          ))}
                          <button style={saveBtn}>Save</button>
                        </form>
                      ) : (
                        <span>{u.locations.join(", ") || "none"}</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {canDeleteUser(viewer, u) ? (
                        <form action={deleteUserAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <button style={delBtn}>Delete</button>
                        </form>
                      ) : (
                        <span style={{ color: "var(--mu)", fontSize: 11 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <AddUserForm locations={LOCATIONS} />
      </main>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--sf)", border: "1px solid var(--ln)", borderRadius: 12, padding: 20 };
const h3: React.CSSProperties = { fontSize: 14, fontWeight: 700, margin: "0 0 14px" };
const th: React.CSSProperties = { padding: "0 10px 8px" };
const td: React.CSSProperties = { padding: "10px" };
const navLink: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--ink)", textDecoration: "none", background: "transparent", border: "1px solid var(--ln)", borderRadius: 7, padding: "5px 10px", cursor: "pointer" };
const chk: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink)", background: "var(--bg)", border: "1px solid var(--ln)", borderRadius: 6, padding: "3px 7px", cursor: "pointer" };
const saveBtn: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: "#fff", background: "var(--ac)", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" };
const delBtn: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: "#ef4444", background: "transparent", border: "1px solid #ef444455", borderRadius: 6, padding: "4px 10px", cursor: "pointer" };
