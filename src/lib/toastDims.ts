import { db } from "./db";

// Distinct raw Toast values for the admin Channels/Categories mapping UI.
export type ToastDimensions = {
  menus: string[];
  dining: string[];
  groups: string[];
};

export async function getToastDimensions(): Promise<ToastDimensions> {
  const pool = db();
  const [menus, dining, groups] = await Promise.all([
    pool.query<{ v: string }>(
      `SELECT menu_name v FROM output.agg_product_mix_daily
        WHERE line_type IN ('menuItem','openItem') AND nullif(menu_name,'') IS NOT NULL
        GROUP BY 1 ORDER BY sum(qty_sold) DESC NULLS LAST`
    ),
    // dining options come from the pipeline's channel crosswalk dim (small + fast)
    pool.query<{ v: string }>(
      `SELECT source_value v FROM output.channel_crosswalk
        WHERE nullif(source_value,'') IS NOT NULL
        GROUP BY 1 ORDER BY max(coalesce(p7_order_rows,0)) DESC, 1`
    ),
    pool.query<{ v: string }>(
      `SELECT menu_group_name v FROM output.agg_product_mix_daily
        WHERE line_type='menuItem' AND nullif(menu_group_name,'') IS NOT NULL
        GROUP BY 1 ORDER BY sum(qty_sold) DESC NULLS LAST`
    ),
  ]);
  return {
    menus: menus.rows.map((r) => r.v),
    dining: dining.rows.map((r) => r.v),
    groups: groups.rows.map((r) => r.v),
  };
}
