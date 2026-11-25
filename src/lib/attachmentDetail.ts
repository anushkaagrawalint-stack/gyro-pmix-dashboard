// Row-level detail behind the attachment analysis: one row per item selection (and, optionally, per modifier) on every check that has a main item,
// with the order id, check id, selection id and - for modifiers - the parent selection id, so each attachment count can be traced to Toast orders.
//   item row:      selection_id = the item's own selection id, parent_selection_id = NULL
//   modifier row:  selection_id = NULL,                        parent_selection_id = the selection id of the item the modifier belongs to
import { db } from "./db";
import { ROLES } from "./dashboardData";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const toInt = (iso: string) => Number(iso.replace(/-/g, ""));

export const ATTACHMENT_DETAIL_COLUMNS = [
  "business_date", "location", "order_id", "check_id", "selection_id", "parent_selection_id", "row_type", "role",
  "menu", "menu_group", "item", "modifier", "quantity", "amount", "check_has_drink", "check_has_side", "check_has_sweet",
] as const;

export async function getAttachmentDetail(startParam: string, endParam: string, includeModifiers: boolean) {
  if (!DATE_RE.test(startParam) || !DATE_RE.test(endParam)) throw new Error("start and end must be YYYY-MM-DD");
  const pool = db();
  const r = await pool.query(
    `WITH l AS (
       SELECT oi.store_location_id loc, oi.order_id, oi.check_id, oi.item_id, oi.row_type,
              to_char(to_date(oi.order_business_date::text,'YYYYMMDD'),'YYYY-MM-DD') d,
              coalesce(oi.menu_name, mo.menu_name, '') menu, coalesce(oi.menu_group_name, mo.menu_group_name, '') grp,
              coalesce(oi.menu_item_name, oi.item_name, '') item, oi.modifier_name,
              CASE WHEN oi.row_type='item' THEN oi.drv_countable_quantity ELSE oi.modifier_quantity END qty,
              CASE WHEN oi.row_type='item' THEN oi.drv_gross_sales ELSE oi.modifier_price_before_discount END amt,
              CASE WHEN coalesce(oi.menu_group_name, mo.menu_group_name) = ANY($3) THEN 'main' WHEN coalesce(oi.menu_group_name, mo.menu_group_name) = ANY($4) THEN 'drink'
                   WHEN coalesce(oi.menu_group_name, mo.menu_group_name) = ANY($5) THEN 'side' WHEN coalesce(oi.menu_group_name, mo.menu_group_name) = ANY($6) THEN 'sweet' ELSE 'other' END role
         FROM sem.sem_order_items oi
         LEFT JOIN output.ref_menu_group_override mo ON mo.menu_group_id = oi.menu_group_id
        WHERE oi.row_type IN ('item','modifier') AND oi.drv_sales_status IS DISTINCT FROM 'VOIDED' AND oi.check_id IS NOT NULL
          AND oi.order_business_date BETWEEN $1 AND $2),
     ck AS (SELECT loc, check_id, coalesce(max((role='drink')::int) FILTER (WHERE row_type='item'),0) dr, coalesce(max((role='side')::int) FILTER (WHERE row_type='item'),0) sd,
                   coalesce(max((role='sweet')::int) FILTER (WHERE row_type='item'),0) sw
              FROM l GROUP BY 1,2 HAVING bool_or(role='main' AND row_type='item'))
     SELECT l.d business_date, l.loc location, l.order_id, l.check_id,
            CASE WHEN l.row_type='item' THEN l.item_id END selection_id, CASE WHEN l.row_type='modifier' THEN l.item_id END parent_selection_id,
            l.row_type, CASE WHEN l.row_type='item' THEN l.role END role, l.menu, l.grp menu_group, l.item, l.modifier_name modifier,
            l.qty::float8 quantity, l.amt::float8 amount, ck.dr check_has_drink, ck.sd check_has_side, ck.sw check_has_sweet
       FROM l JOIN ck ON ck.loc = l.loc AND ck.check_id = l.check_id
      WHERE ($7::bool OR l.row_type = 'item')
      ORDER BY l.d, l.loc, l.order_id, l.check_id, l.row_type, l.item_id`,
    [toInt(startParam), toInt(endParam), ROLES.main, ROLES.drink, ROLES.side, ROLES.sweet, includeModifiers]);
  return r.rows;
}
