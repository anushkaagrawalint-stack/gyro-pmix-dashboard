// Builds the dashboard payload from the Neon database (Toast pipeline layers), in the same shapes the
// prototype used for its embedded data, so the dashboard engine can consume it unchanged:
//   items -> one object per date/location/menu/menu group/item (output.agg_item_daily + dimensions)
//   mods  -> compact {dates, locs, dining, parents, groups, mods, rows}     (sem.sem_order_items)
//   pays  -> [date, location, type, voided, count, amount, tips] rows       (sem.sem_order_payments)
//   att   -> compact {days, locs, menus, items, groups, c, i, roles}       (sem.sem_order_items, check level)
import { db } from "./db";

// Menu-group roles used for the attachment analysis (same as the prototype)
export const ROLES: Record<"main" | "drink" | "side" | "sweet", string[]> = {
  main: ["BYO Bowl", "Pita & Gyrito", "Individual Bowls", "Deals", "Bowls", "Loaded Fries"],
  drink: ["Drinks", "Beverages"],
  side: ["Sides & Extras", "A La Carte Sides"],
  sweet: ["Dessert", "Desserts"],
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const toInt = (iso: string) => Number(iso.replace(/-/g, ""));

/** Yesterday in the stores' time zone - the latest complete business day. */
function yesterdayChicago(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date(Date.now() - 864e5));
}

class Indexer {
  list: string[] = [];
  private map = new Map<string, number>();
  idx(v: string): number {
    let i = this.map.get(v);
    if (i === undefined) { i = this.list.length; this.list.push(v); this.map.set(v, i); }
    return i;
  }
}

export async function getDashboardData(startParam?: string | null, endParam?: string | null) {
  const pool = db();

  // available business dates: complete days only - from the first day the pipeline pulled, never later than yesterday (store time) and never later than the
  // last business date the nightly pipeline finished successfully (later dates only hold orders placed in advance)
  const lim = (await pool.query(
    `WITH last_ok AS (SELECT max(to_date(business_date::text,'YYYYMMDD')) d FROM raw.pipeline_runs WHERE status = 'success'),
          first_pulled AS (SELECT min(to_date(business_date::text,'YYYYMMDD')) d FROM raw.pull_runs WHERE status = 'success' AND business_date IS NOT NULL)
     SELECT to_char(min(business_date),'YYYY-MM-DD') mn, to_char(max(business_date),'YYYY-MM-DD') mx
       FROM output.agg_order_daily
      WHERE business_date <= LEAST($1::date, coalesce((SELECT d FROM last_ok), $1::date))
        AND business_date >= coalesce((SELECT d FROM first_pulled), business_date) -- earlier dates only hold stray orders
        AND order_count > 0`, [yesterdayChicago()])).rows[0];
  const dataMin: string | null = lim.mn, dataMax: string | null = lim.mx;
  if (!dataMin || !dataMax) return { items: [], mods: emptyMods(), pays: [], att: emptyAtt(), meta: { min: null, max: null, start: null, end: null, asOf: null } };

  // default window: year to date of the latest data
  let end = endParam && DATE_RE.test(endParam) ? endParam : dataMax;
  const fy = await pool.query(`SELECT to_char(min(start_date),'YYYY-MM-DD') s FROM output.fiscal_calendar
      WHERE fiscal_year = (SELECT fiscal_year FROM output.fiscal_calendar WHERE $1::date BETWEEN start_date AND end_date)`, [dataMax])
    .then((r) => r.rows[0]?.s as string | null).catch(() => null);
  let start = startParam && DATE_RE.test(startParam) ? startParam : fy || `${dataMax.slice(0, 4)}-01-01`;
  if (end > dataMax) end = dataMax;
  if (start < dataMin) start = dataMin;
  if (start > end) start = end;
  const s = toInt(start), e = toInt(end);

  const [items, mods, pays, attC, attI, attX, asOf, hoursQ, salesDailyRes] = await Promise.all([
    // ---- items (output layer)
    pool.query(`
      SELECT to_char(a.business_date,'YYYY-MM-DD') d, a.store_location_id loc,
             coalesce(a.menu_name,'Open items') menu, CASE WHEN a.line_type='openItem' THEN 'Open Food' ELSE coalesce(a.menu_group_name,'(No menu group)') END grp,
             CASE WHEN a.line_type='openItem' THEN 'openItem' ELSE 'menuItem' END type,
             coalesce(a.item_name,'(unknown item)') item, coalesce(a.sales_category_name,'No Sales Category Assigned') sc,
             sum(a.qty_sold)::float8 q, sum(a.gross_amount)::float8 g, sum(a.discount_amount)::float8 disc, sum(a.refund_amount)::float8 ref,
             sum(a.void_amount)::float8 vd, sum(a.net_amount)::float8 n, sum(a.tax_amount)::float8 tax,
             sum(a.waste_qty)::float8 wq, sum(a.waste_amount)::float8 wa, sum(a.voided_gross_amount)::float8 vg, sum(a.voided_qty)::float8 vq,
             sum(a.qty_sold + a.voided_qty)::float8 qi, sum(a.gross_amount + a.voided_gross_amount)::float8 gi
        FROM output.agg_product_mix_daily a
       WHERE a.business_date BETWEEN $1::date AND $2::date AND a.line_type IN ('menuItem','openItem')
       GROUP BY 1,2,3,4,5,6,7`, [start, end]),
    // ---- modifiers: lazy-loaded on demand via getModsData() / /api/mods (heavy ~25MB; only Entree Mix, Channels-Modifiers, Loc-Compare-Modifiers need it), so it is NOT fetched on the initial dashboard load
    Promise.resolve({ rows: [] as Array<{ d: string; loc: string; dn: string; p: string; g: string; mo: string; menu: string; q: number; rev: number }> }),
    // ---- payments (captured, attributed to the sales day) + refunds (attributed to the day processed), for the Payout Overview / Payment Source view
    pool.query(`
      SELECT to_char(to_date(order_business_date::text,'YYYYMMDD'),'YYYY-MM-DD') d, store_location_id loc,
             CASE WHEN drv_payment_type_group = 'Credit/debit' THEN 'Card' ELSE 'Alt' END grp,
             CASE WHEN drv_payment_type_group = 'Credit/debit' THEN 'Card'
                  ELSE coalesce(nullif(other_payment_name,''), nullif(drv_payment_sub_type,''), payment_type, 'Other') END src,
             0 kind, count(*)::int n,
             sum(coalesce(payment_amount,0))::float8 a, sum(coalesce(drv_tips,0))::float8 t,
             sum(coalesce(payment_processing_fee_amount,0))::float8 fee, 0::float8 ref
        FROM sem.sem_order_payments
       WHERE payment_status = 'CAPTURED' AND order_business_date BETWEEN $1 AND $2
       GROUP BY 1,2,3,4
      UNION ALL
      SELECT to_char(to_date(payment_refund_business_date::text,'YYYYMMDD'),'YYYY-MM-DD') d, store_location_id loc,
             CASE WHEN drv_payment_type_group = 'Credit/debit' THEN 'Card' ELSE 'Alt' END grp,
             CASE WHEN drv_payment_type_group = 'Credit/debit' THEN 'Card'
                  ELSE coalesce(nullif(other_payment_name,''), nullif(drv_payment_sub_type,''), payment_type, 'Other') END src,
             1 kind, count(*)::int n, 0::float8 a, 0::float8 t, 0::float8 fee,
             sum(coalesce(drv_refund_net,0))::float8 ref
        FROM sem.sem_order_payments
       WHERE coalesce(drv_refund_net,0) <> 0 AND payment_refund_business_date BETWEEN $1 AND $2
       GROUP BY 1,2,3,4`, [s, e]),
    // ---- attachment, check level: checks with a main item, and whether they also have a drink / side / sweet
    pool.query(attSql("c"), [s, e, ROLES.main, ROLES.drink, ROLES.side, ROLES.sweet]),
    pool.query(attSql("i"), [s, e, ROLES.main, ROLES.drink, ROLES.side, ROLES.sweet]),
    pool.query(attSql("x"), [s, e, ROLES.main, ROLES.drink, ROLES.side, ROLES.sweet]),
    pool.query(`SELECT max(finished_at) t FROM raw.pipeline_runs WHERE status = 'success'`),
    // ---- hour-of-day net sales (for the Daily view's time-of-day breakdown); order-level, excludes voided orders
    pool.query(`SELECT to_char(to_date(order_business_date::text,'YYYYMMDD'),'YYYY-MM-DD') d, drv_hour_order_opened_at hr,
             store_location_id loc, sum(drv_net_sales)::float8 net
        FROM sem.sem_order_header
       WHERE order_business_date BETWEEN $1 AND $2 AND NOT coalesce(is_order_voided,false) AND drv_hour_order_opened_at IS NOT NULL
       GROUP BY 1,2,3`, [s, e]),
    // ---- daily net sales over FULL history (NOT bounded to the selected window) — powers the vs-previous / vs-last-year comparison bars
    pool.query(`SELECT to_char(business_date,'YYYY-MM-DD') d, store_location_id loc, sum(net_amount)::float8 net
        FROM output.agg_product_mix_daily
       WHERE business_date BETWEEN $1::date AND $2::date AND line_type IN ('menuItem','openItem')
       GROUP BY 1,2`, [dataMin, dataMax]),
  ]);
  // fiscal calendar (4-4-5) from the output layer; the dashboard falls back to calendar months if it is not there yet
  const fiscal = await pool.query(`SELECT fiscal_year, period, quarter, to_char(start_date,'YYYY-MM-DD') s, to_char(end_date,'YYYY-MM-DD') e
      FROM output.fiscal_calendar ORDER BY start_date`).then((r) => r.rows).catch(() => []);

  // encode modifiers like the prototype's EMB_MODS
  const md = { dates: new Indexer(), locs: new Indexer(), dining: new Indexer(), parents: new Indexer(), groups: new Indexer(), mods: new Indexer(), menus: new Indexer() };
  const modRows = mods.rows.map((r) => [md.dates.idx(r.d), md.locs.idx(r.loc), md.dining.idx(r.dn), md.parents.idx(r.p), md.groups.idx(r.g), md.mods.idx(r.mo), r.q, Math.round(r.rev * 100) / 100, md.menus.idx(r.menu)]);

  // encode attachment like the prototype's EMB_ATT
  const at = { days: new Indexer(), locs: new Indexer(), menus: new Indexer(), items: new Indexer(), groups: new Indexer() };
  const c = attC.rows.map((r) => [at.days.idx(r.d), at.locs.idx(r.loc), at.menus.idx(r.menu), r.n, r.dr, r.sd, r.sw, r.anyx, r.na]);
  const i = attI.rows.map((r) => [at.days.idx(r.d), at.locs.idx(r.loc), at.menus.idx(r.menu), at.items.idx(r.item), at.groups.idx(r.grp), r.n, r.dr, r.sd, r.sw, r.anyx, r.na]);
  const x = attX.rows.map((r: { d: string; loc: string; menu: string; item: string; grp: string; cat: string; checks: number }) => [at.days.idx(r.d), at.locs.idx(r.loc), at.menus.idx(r.menu), at.items.idx(r.item), at.groups.idx(r.grp), r.cat, r.checks]);

  return {
    items: items.rows.map((r) => ({ ...r, tags: "[]" })),
    mods: { dates: md.dates.list, locs: md.locs.list, dining: md.dining.list, parents: md.parents.list, groups: md.groups.list, mods: md.mods.list, menus: md.menus.list, rows: modRows },
    pays: pays.rows.map((r) => [r.d, r.loc, r.grp, r.src, r.kind, r.n, Math.round(r.a * 100) / 100, Math.round(r.t * 100) / 100, Math.round(r.fee * 100) / 100, Math.round(r.ref * 100) / 100]),
    att: { days: at.days.list, locs: at.locs.list, menus: at.menus.list, items: at.items.list, groups: at.groups.list, c, i, x, roles: ROLES },
    hours: hoursQ.rows.map((r: { d: string; hr: number; loc: string; net: number }) => [r.d, r.hr, r.loc, Math.round(r.net)]),
    salesDaily: salesDailyRes.rows.map((r: { d: string; loc: string; net: number }) => [r.d, r.loc, Math.round(r.net * 100) / 100]),
    meta: { min: dataMin, max: dataMax, start, end, asOf: asOf.rows[0]?.t ?? null, fiscal },
  };
}

/** Modifier data for the given window — lazy-loaded (heavy) by /api/mods when a modifier view is opened. */
export async function getModsData(start: string, end: string) {
  const pool = db();
  const s = toInt(start), e = toInt(end);
  const mods = await pool.query(
    `WITH win_mods AS (
       SELECT DISTINCT modifier_name FROM sem.sem_order_items
        WHERE row_type = 'modifier' AND order_business_date BETWEEN $1 AND $2 AND nullif(modifier_group_name,'') IS NULL),
     gx AS (
       SELECT s.modifier_name, mode() WITHIN GROUP (ORDER BY s.modifier_group_name) nm
         FROM sem.sem_order_items s JOIN win_mods w ON w.modifier_name = s.modifier_name
        WHERE s.row_type = 'modifier' AND nullif(s.modifier_group_name,'') IS NOT NULL
        GROUP BY 1)
     SELECT to_char(to_date(m.order_business_date::text,'YYYYMMDD'),'YYYY-MM-DD') d, m.store_location_id loc,
            coalesce(i.dining_option_name,'') dn, coalesce(i.item_name, i.menu_item_name, '') p,
            coalesce(nullif(m.modifier_group_name,''), gx.nm, '(No option group)') g, coalesce(m.modifier_name,'') mo,
            coalesce(nullif(i.menu_name,''), ovr.menu_name, '') menu,
            sum(m.modifier_quantity)::float8 q, sum(coalesce(m.modifier_price_before_discount,0))::float8 rev
       FROM sem.sem_order_items m
       JOIN sem.sem_order_items i ON i.row_type = 'item' AND i.store_location_id = m.store_location_id AND i.item_id = m.item_id
            AND i.order_business_date BETWEEN $1 AND $2
       LEFT JOIN output.ref_menu_group_override ovr ON ovr.menu_group_id = i.menu_group_id
       LEFT JOIN gx ON gx.modifier_name = m.modifier_name
      WHERE m.row_type = 'modifier' AND m.drv_sales_status IS DISTINCT FROM 'VOIDED'
        AND m.order_business_date BETWEEN $1 AND $2
      GROUP BY 1,2,3,4,5,6,7`, [s, e]);
  const md = { dates: new Indexer(), locs: new Indexer(), dining: new Indexer(), parents: new Indexer(), groups: new Indexer(), mods: new Indexer(), menus: new Indexer() };
  const rows = mods.rows.map((r) => [md.dates.idx(r.d), md.locs.idx(r.loc), md.dining.idx(r.dn), md.parents.idx(r.p), md.groups.idx(r.g), md.mods.idx(r.mo), r.q, Math.round(r.rev * 100) / 100, md.menus.idx(r.menu)]);
  return { dates: md.dates.list, locs: md.locs.list, dining: md.dining.list, parents: md.parents.list, groups: md.groups.list, mods: md.mods.list, menus: md.menus.list, rows };
}

function attSql(kind: "c" | "i" | "x") {
  const base = `
    WITH l AS (
      SELECT store_location_id loc, check_id ck, to_char(to_date(order_business_date::text,'YYYYMMDD'),'YYYY-MM-DD') d,
             coalesce(oi.menu_name, mo.menu_name, '') menu, coalesce(oi.menu_item_name, oi.item_name, '') item, coalesce(oi.menu_group_name, mo.menu_group_name, '') grp,
             item_id,
             CASE WHEN coalesce(oi.menu_group_name, mo.menu_group_name) = ANY($3) THEN 'main' WHEN coalesce(oi.menu_group_name, mo.menu_group_name) = ANY($4) THEN 'drink'
                  WHEN coalesce(oi.menu_group_name, mo.menu_group_name) = ANY($5) THEN 'side' WHEN coalesce(oi.menu_group_name, mo.menu_group_name) = ANY($6) THEN 'sweet' ELSE 'other' END role
        FROM sem.sem_order_items oi
        LEFT JOIN output.ref_menu_group_override mo ON mo.menu_group_id = oi.menu_group_id -- menu groups deleted from the Toast config: name/menu from the override table
       WHERE oi.row_type = 'item' AND oi.drv_sales_status IS DISTINCT FROM 'VOIDED' AND oi.check_id IS NOT NULL
         AND oi.order_business_date BETWEEN $1 AND $2),
    ck AS (
      SELECT loc, ck, max((role='drink')::int) dr, max((role='side')::int) sd, max((role='sweet')::int) sw,
             count(DISTINCT item) FILTER (WHERE role IN ('drink','side','sweet'))::int na, -- distinct attach item NAMES on the check (items only) → name-level Overall
             (array_agg(d ORDER BY menu, item_id) FILTER (WHERE role='main'))[1] d, (array_agg(menu ORDER BY menu, item_id) FILTER (WHERE role='main'))[1] menu
        FROM l GROUP BY 1,2 HAVING bool_or(role='main'))`;
  if (kind === "c")
    return base + `
    SELECT d, loc, menu, count(*)::int n, sum(dr)::int dr, sum(sd)::int sd, sum(sw)::int sw, sum(greatest(dr,sd,sw))::int anyx, sum(na)::int na
      FROM ck GROUP BY 1,2,3`;
  if (kind === "x")
    // every item (Main/Drink/Side/Sweet): count of main-checks that contain it, per date/location/menu — for the item×location pivot
    return base + `
    SELECT l.d, l.loc, ck.menu, l.item, l.grp,
           CASE WHEN l.role='main' THEN 'Main' WHEN l.role='drink' THEN 'Drink' WHEN l.role='side' THEN 'Side' ELSE 'Sweet' END cat,
           count(DISTINCT l.ck)::int checks
      FROM l JOIN ck ON ck.loc=l.loc AND ck.ck=l.ck
     WHERE l.role IN ('main','drink','side','sweet')
     GROUP BY 1,2,3,4,5,6`;
  return base + `,
    mi AS (SELECT DISTINCT loc, ck, d, menu, item, grp FROM l WHERE role='main')
    SELECT mi.d, mi.loc, mi.menu, mi.item, mi.grp, count(*)::int n, sum(ck.dr)::int dr, sum(ck.sd)::int sd, sum(ck.sw)::int sw,
           sum(greatest(ck.dr,ck.sd,ck.sw))::int anyx, sum(ck.na)::int na
      FROM mi JOIN ck USING (loc, ck) GROUP BY 1,2,3,4,5`;
}

const emptyMods = () => ({ dates: [], locs: [], dining: [], parents: [], groups: [], mods: [], menus: [], rows: [] });
const emptyAtt = () => ({ days: [], locs: [], menus: [], items: [], groups: [], c: [], i: [], roles: ROLES });
