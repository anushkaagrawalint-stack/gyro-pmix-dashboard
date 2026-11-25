import { Suspense } from "react";
import { requireRole, visibleUsers, canDeleteUser } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { getOpenLocations, getGrouping } from "@/lib/settings";
import { getToastDimensions } from "@/lib/toastDims";
import { LOCATIONS } from "@/lib/locations";
import { logout } from "@/app/actions/auth";
import { setOpenLocationsAction, saveChannelsAction, saveCategoriesAction } from "./actions";
import AddUserForm from "./AddUserForm";
import UserRow from "./UserRow";
import GroupingEditor from "./GroupingEditor";

const CHAN_SUGGEST = ["In-House", "In-store", "App & Website", "Delivery", "Catering", "3PD Catering", "Other"];
const CAT_SUGGEST = ["Bowls", "Pita & Gyrito", "Sides", "Drinks", "Desserts", "Deals", "Catering", "Other"];

export const metadata = { title: "Admin · Gyro Republic" };

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, fontFamily: "var(--font-inter)", color: "var(--mu)" }}>Loading…</div>}>
      <AdminBody />
    </Suspense>
  );
}

async function AdminBody() {
  const viewer = await requireRole(["admin", "owner"]);
  const users = visibleUsers(viewer, await listUsers());
  const open = await getOpenLocations();
  const [dims, g] = await Promise.all([getToastDimensions(), getGrouping()]);
  const chInit = {
    channelByMenu: Object.fromEntries(dims.menus.map((m) => [m, { a: g.channelByMenu[m]?.channel ?? "", b: g.channelByMenu[m]?.sub ?? "" }])),
    channelByDining: Object.fromEntries(dims.dining.map((d) => [d, { a: g.channelByDining[d]?.channel ?? "", b: g.channelByDining[d]?.sub ?? "" }])),
  };
  const catInit = {
    categoryByGroup: Object.fromEntries(dims.groups.map((gr) => [gr, { a: g.categoryByGroup[gr]?.category ?? "", b: g.categoryByGroup[gr]?.sub ?? "" }])),
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", fontFamily: "var(--font-inter)", color: "var(--ink)" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: "1px solid var(--ln)", background: "var(--sf)" }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ac)" }} />
        <h1 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Admin settings</h1>
        <span style={{ fontSize: 11.5, color: "var(--mu)" }}>signed in as {viewer.name} ({viewer.role})</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <a href="/" style={navLink}>← Dashboard</a>
          <form action={logout}><button style={navLink as React.CSSProperties}>Sign out</button></form>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 22px", display: "grid", gap: 22 }}>
        {/* Open / closed locations */}
        <section style={card}>
          <h3 style={h3}>Store locations</h3>
          <p style={{ fontSize: 12, color: "var(--mu)", margin: "0 0 14px" }}>Checked = open. Unchecked stores are treated as closed and excluded from all dashboard data for everyone.</p>
          <form action={setOpenLocationsAction} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {LOCATIONS.map((l) => (
              <label key={l} style={chk}>
                <input type="checkbox" name="open" value={l} defaultChecked={open.includes(l)} /> {l}
              </label>
            ))}
            <button style={{ ...saveBtn, marginLeft: 6 }}>Save locations</button>
          </form>
        </section>

        {/* Users */}
        <section style={card}>
          <h3 style={h3}>Users</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--mu)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  <th style={th}>Name</th><th style={th}>Email</th><th style={th}>Role</th><th style={th}>Locations</th><th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    you={u.id === viewer.id}
                    canEdit={u.role !== "admin"}
                    canDelete={canDeleteUser(viewer, u)}
                    locations={LOCATIONS}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <AddUserForm locations={LOCATIONS} />

        <GroupingEditor
          title="Channels"
          note="Map raw Toast menus and dining options into channels + sub-channels. Same channel on multiple rows merges them (e.g. both in-house menus → In-House). Blank = use the built-in default."
          sections={[
            { key: "channelByMenu", label: "Menus", values: dims.menus },
            { key: "channelByDining", label: "Dining options", values: dims.dining },
          ]}
          initial={chInit}
          aLabel="Channel"
          bLabel="Sub-channel"
          suggestions={CHAN_SUGGEST}
          action={saveChannelsAction}
        />

        <GroupingEditor
          title="Categories"
          note="Map Toast menu groups into categories + sub-categories. Blank = use the built-in default."
          sections={[{ key: "categoryByGroup", label: "Menu groups", values: dims.groups }]}
          initial={catInit}
          aLabel="Category"
          bLabel="Sub-category"
          suggestions={CAT_SUGGEST}
          action={saveCategoriesAction}
        />
      </main>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--sf)", border: "1px solid var(--ln)", borderRadius: 12, padding: 20 };
const h3: React.CSSProperties = { fontSize: 14, fontWeight: 700, margin: "0 0 6px" };
const th: React.CSSProperties = { padding: "0 10px 8px" };
const navLink: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--ink)", textDecoration: "none", background: "transparent", border: "1px solid var(--ln)", borderRadius: 7, padding: "5px 10px", cursor: "pointer" };
const chk: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink)", background: "var(--bg)", border: "1px solid var(--ln)", borderRadius: 7, padding: "6px 10px", cursor: "pointer" };
const saveBtn: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#fff", background: "var(--ac)", border: "none", borderRadius: 7, padding: "7px 14px", cursor: "pointer" };
