import { ATTACHMENT_DETAIL_COLUMNS, getAttachmentDetail } from "@/lib/attachmentDetail";
import { getCurrentUser } from "@/lib/auth";

// GET /api/attachment-detail?start=YYYY-MM-DD&end=YYYY-MM-DD[&modifiers=1][&format=csv]
// One row per item selection (and modifier with modifiers=1) on every check that has a main item, with order id, check id, selection id and parent selection id.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";
  try {
    let rows = await getAttachmentDetail(start, end, searchParams.get("modifiers") === "1");
    // Managers only see their granted locations.
    if (user.role === "manager") {
      const allowed = new Set(user.locations);
      rows = rows.filter((r) => allowed.has(String(r.location)));
    }
    if (searchParams.get("format") === "csv") {
      const esc = (v: unknown) => (v === null || v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
      const csv = [ATTACHMENT_DETAIL_COLUMNS.join(","), ...rows.map((r) => ATTACHMENT_DETAIL_COLUMNS.map((c) => esc(r[c])).join(","))].join("\n");
      return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="attachment-detail_${start}_${end}.csv"` } });
    }
    return Response.json({ columns: ATTACHMENT_DETAIL_COLUMNS, rows: rows.map((r) => ATTACHMENT_DETAIL_COLUMNS.map((c) => r[c])) });
  } catch (err) {
    console.error("attachment detail error", err);
    return Response.json({ error: "Could not load attachment detail" }, { status: 400 });
  }
}
