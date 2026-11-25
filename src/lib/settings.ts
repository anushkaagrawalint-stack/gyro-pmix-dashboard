import { db } from "./db";
import { LOCATIONS } from "./locations";

// App settings — Neon Postgres (schema "app", key/value). Admin/owner controlled.
// Lazily creates the table so it works on serverless hosts (Vercel).

export type ChannelEntry = { channel: string; sub: string };
export type CategoryEntry = { category: string; sub: string };

export type GroupingConfig = {
  channelByMenu: Record<string, ChannelEntry>;
  channelByDining: Record<string, ChannelEntry>;
  categoryByGroup: Record<string, CategoryEntry>;
};

export type AppSettings = {
  openLocations: string[];
  grouping: GroupingConfig;
};

const EMPTY_GROUPING: GroupingConfig = { channelByMenu: {}, channelByDining: {}, categoryByGroup: {} };

let initPromise: Promise<void> | null = null;
function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = db()
    .query(`CREATE TABLE IF NOT EXISTS public.app_settings (key text PRIMARY KEY, value jsonb NOT NULL)`)
    .then(() => undefined)
    .catch((e) => { initPromise = null; throw e; });
  return initPromise;
}

async function getKey<T>(key: string, fallback: T): Promise<T> {
  await ensureInit();
  const r = await db().query<{ value: T }>(`SELECT value FROM public.app_settings WHERE key=$1`, [key]);
  return r.rows[0] ? r.rows[0].value : fallback;
}
async function setKey(key: string, value: unknown): Promise<void> {
  await ensureInit();
  await db().query(
    `INSERT INTO public.app_settings (key, value) VALUES ($1,$2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value=excluded.value`,
    [key, JSON.stringify(value)]
  );
}

export async function getOpenLocations(): Promise<string[]> {
  return getKey<string[]>("openLocations", [...LOCATIONS]);
}
export async function setOpenLocations(locations: string[]): Promise<void> {
  await setKey("openLocations", locations.filter((l) => (LOCATIONS as readonly string[]).includes(l)));
}

export async function getGrouping(): Promise<GroupingConfig> {
  const g = await getKey<Partial<GroupingConfig>>("grouping", {});
  return { ...EMPTY_GROUPING, ...g };
}
export async function setGrouping(patch: Partial<GroupingConfig>): Promise<void> {
  const cur = await getGrouping();
  await setKey("grouping", { ...cur, ...patch });
}

export async function getSettings(): Promise<AppSettings> {
  const [openLocations, grouping] = await Promise.all([getOpenLocations(), getGrouping()]);
  return { openLocations, grouping };
}
