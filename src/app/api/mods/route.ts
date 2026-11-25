import { getModsData } from "@/lib/dashboardData";
import { getCurrentUser } from "@/lib/auth";

export const maxDuration = 60; // the mods query is heavy (~15-20s)

// GET /api/mods?start=YYYY-MM-DD&end=YYYY-MM-DD  — lazy-loaded modifier data for the Entree Mix / Channels-Modifiers / Loc-Compare-Modifiers views
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start"), end = searchParams.get("end");
  if (!start || !end) return Response.json({ error: "start and end are required" }, { status: 400 });
  try {
    const mods = await getModsData(start, end);
    // Managers only see their granted locations.
    if (user.role === "manager" && mods?.rows) {
      const allowed = new Set(user.locations);
      const locs: string[] = mods.locs ?? [];
      mods.rows = mods.rows.filter((row: any) => allowed.has(locs[row[1]]));
    }
    return Response.json({ mods }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("mods data error", err);
    return Response.json({ error: "Could not load modifier data" }, { status: 500 });
  }
}
