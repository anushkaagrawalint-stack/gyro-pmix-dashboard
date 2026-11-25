import { getDashboardData } from "@/lib/dashboardData";
import { getCurrentUser } from "@/lib/auth";
import { getOpenLocations, getGrouping } from "@/lib/settings";

// Keep only rows belonging to the allowed locations. Managers get their granted
// subset; admin/owner (allowed === null) get everything. Filtering happens on the
// server so restricted data never reaches the client.
function filterByLocations(data: any, allowed: Set<string> | null) {
  if (!allowed) return data;
  const ok = (loc: string) => allowed.has(loc);
  const out = { ...data };

  if (Array.isArray(data.items)) out.items = data.items.filter((r: any) => ok(r.loc));
  if (Array.isArray(data.pays)) out.pays = data.pays.filter((p: any) => ok(p[1]));
  if (Array.isArray(data.hours)) out.hours = data.hours.filter((h: any) => ok(h[2]));

  if (data.mods?.rows) {
    const locs: string[] = data.mods.locs ?? [];
    out.mods = { ...data.mods, rows: data.mods.rows.filter((row: any) => ok(locs[row[1]])) };
  }
  if (data.att) {
    const locs: string[] = data.att.locs ?? [];
    out.att = {
      ...data.att,
      c: (data.att.c ?? []).filter((row: any) => ok(locs[row[1]])),
      i: (data.att.i ?? []).filter((row: any) => ok(locs[row[1]])),
      x: (data.att.x ?? []).filter((row: any) => ok(locs[row[1]])),
    };
  }
  return out;
}

// GET /api/dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD  (both optional; default = year to date of the latest data)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  try {
    const data = await getDashboardData(searchParams.get("start"), searchParams.get("end"));
    // Closed locations are excluded for everyone; managers are further limited to their granted set.
    const open = await getOpenLocations();
    const allowed = new Set(user.role === "manager" ? user.locations.filter((l) => open.includes(l)) : open);
    const out = filterByLocations(data, allowed);
    out.config = await getGrouping(); // admin/owner channel & category overrides
    return Response.json(out, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("dashboard data error", err);
    return Response.json({ error: "Could not load dashboard data" }, { status: 500 });
  }
}
