import crypto from "node:crypto";
import { db } from "./db";
import { LOCATIONS } from "./locations";

// ─────────────────────────────────────────────────────────────────────────────
// User store — the existing public.users table in Neon:
//   u_id uuid, user_name, user_email, password_salt, password_hash,
//   location text[], access (= role), last_update, user_created, last_login
// Seeds the 3 dummy users on first use if the table is empty. Works on Vercel
// (no file writes). Function signatures match the previous store.
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "admin" | "owner" | "manager";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  locations: string[];
  createdAt: string;
  createdBy: string | null;
};
export type PublicUser = User;

// The DB's public.users.access uses "store_manager" (CHECK constraint); the app uses "manager".
function toDbAccess(role: Role): string {
  return role === "manager" ? "store_manager" : role;
}
function toAppRole(access: string): Role {
  return access === "store_manager" ? "manager" : (access as Role);
}

// ── password hashing (scrypt; salt + hash stored in separate columns) ──
function makeHash(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}
function verifyHash(password: string, salt: string, hash: string): boolean {
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// ── one-time create-if-missing + seed (idempotent) ──
let initPromise: Promise<void> | null = null;
function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = doInit().catch((e) => { initPromise = null; throw e; });
  return initPromise;
}
async function doInit(): Promise<void> {
  const pool = db();
  // fallback for a fresh database; the existing public.users is left untouched
  await pool.query(`CREATE TABLE IF NOT EXISTS public.users (
    u_id uuid PRIMARY KEY,
    user_name text NOT NULL,
    user_email text NOT NULL,
    password_salt text NOT NULL,
    password_hash text NOT NULL,
    location text[] NOT NULL DEFAULT '{}',
    access text NOT NULL,
    last_update timestamptz NOT NULL DEFAULT now(),
    user_created timestamptz NOT NULL DEFAULT now(),
    last_login timestamptz
  )`);
  // one account per email (prevents duplicate seeds under concurrency)
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON public.users (lower(user_email))`).catch(() => {});
  const seed = [
    { email: "admin@kutlerri.ai", name: "Admin", role: "admin", pw: "admin@123", locs: [...LOCATIONS] },
    { email: "owner@kutlerri.ai", name: "Owner", role: "owner", pw: "owner@123", locs: [...LOCATIONS] },
    { email: "manager@kutlerri.ai", name: "Store Manager", role: "manager", pw: "manager@123", locs: ["Fondren", "Richmond", "Katy"] },
  ];
  // idempotent: add only the seed users that aren't present yet
  for (const s of seed) {
    const { salt, hash } = makeHash(s.pw);
    await pool.query(
      `INSERT INTO public.users (u_id, user_name, user_email, password_salt, password_hash, location, access, last_update, user_created)
       SELECT $1,$2,$3,$4,$5,$6,$7,now(),now()
       WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE lower(user_email)=lower($3))`,
      [crypto.randomUUID(), s.name, s.email, salt, hash, s.locs, toDbAccess(s.role as Role)]
    ).catch(() => {});
  }
}

type Row = { u_id: string; user_name: string; user_email: string; password_salt: string; password_hash: string; location: string[]; access: string; user_created: string };
const toPublic = (r: Row): PublicUser => ({
  id: r.u_id, email: r.user_email, name: r.user_name, role: toAppRole(r.access),
  locations: r.location ?? [], createdAt: new Date(r.user_created).toISOString(), createdBy: null,
});

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ensureInit();
  const r = await db().query(sql, params);
  return r.rows as T[];
}

// ── reads ──
export async function listUsers(): Promise<PublicUser[]> {
  return (await query<Row>(`SELECT * FROM public.users ORDER BY user_created`)).map(toPublic);
}
export async function findById(id: string): Promise<PublicUser | null> {
  const r = await query<Row>(`SELECT * FROM public.users WHERE u_id=$1`, [id]);
  return r[0] ? toPublic(r[0]) : null;
}
export async function verifyCredentials(email: string, password: string): Promise<PublicUser | null> {
  const r = await query<Row>(`SELECT * FROM public.users WHERE lower(user_email)=lower($1)`, [email.trim()]);
  if (!r[0] || !verifyHash(password, r[0].password_salt, r[0].password_hash)) return null;
  await db().query(`UPDATE public.users SET last_login=now() WHERE u_id=$1`, [r[0].u_id]).catch(() => {});
  return toPublic(r[0]);
}

// ── writes ──
export async function createUser(input: {
  email: string; name: string; role: Exclude<Role, "admin">; password: string; locations?: string[]; createdBy: string;
}): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const dup = await query<{ u_id: string }>(`SELECT u_id FROM public.users WHERE lower(user_email)=$1`, [email]);
  if (dup[0]) throw new Error("A user with that email already exists.");
  const locs = input.role === "manager" ? (input.locations ?? []).filter((l) => (LOCATIONS as readonly string[]).includes(l)) : [...LOCATIONS];
  if (input.role === "manager" && locs.length === 0) throw new Error("A store manager must have at least one location.");
  const { salt, hash } = makeHash(input.password);
  const r = await query<Row>(
    `INSERT INTO public.users (u_id, user_name, user_email, password_salt, password_hash, location, access, last_update, user_created)
     VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now()) RETURNING *`,
    [crypto.randomUUID(), input.name.trim() || email, email, salt, hash, locs, toDbAccess(input.role)]
  );
  return toPublic(r[0]);
}

export async function deleteUser(id: string): Promise<void> {
  const r = await query<Row>(`SELECT access FROM public.users WHERE u_id=$1`, [id]);
  if (!r[0]) throw new Error("User not found.");
  if (toAppRole(r[0].access) === "admin") throw new Error("The admin account cannot be deleted.");
  await query(`DELETE FROM public.users WHERE u_id=$1`, [id]);
}

export async function setManagerLocations(id: string, locations: string[]): Promise<void> {
  const r = await query<Row>(`SELECT access FROM public.users WHERE u_id=$1`, [id]);
  if (!r[0]) throw new Error("User not found.");
  if (toAppRole(r[0].access) !== "manager") throw new Error("Only managers have per-location access.");
  const locs = locations.filter((l) => (LOCATIONS as readonly string[]).includes(l));
  if (locs.length === 0) throw new Error("A store manager must have at least one location.");
  await query(`UPDATE public.users SET location=$2, last_update=now() WHERE u_id=$1`, [id, locs]);
}

export async function updateUser(
  id: string,
  patch: { name?: string; email?: string; role?: Exclude<Role, "admin">; password?: string; locations?: string[] }
): Promise<PublicUser> {
  const cur = (await query<Row>(`SELECT * FROM public.users WHERE u_id=$1`, [id]))[0];
  if (!cur) throw new Error("User not found.");
  if (toAppRole(cur.access) === "admin") throw new Error("The admin account cannot be edited here.");

  const name = patch.name?.trim() || cur.user_name;
  let email = cur.user_email;
  if (patch.email !== undefined && patch.email.trim()) {
    email = patch.email.trim().toLowerCase();
    if (email !== cur.user_email) {
      const dup = await query<{ u_id: string }>(`SELECT u_id FROM public.users WHERE lower(user_email)=$1 AND u_id<>$2`, [email, id]);
      if (dup[0]) throw new Error("A user with that email already exists.");
    }
  }
  const role: Role = patch.role === "owner" || patch.role === "manager" ? patch.role : toAppRole(cur.access);
  const locations = role === "owner" ? [...LOCATIONS] : (patch.locations ? patch.locations.filter((l) => (LOCATIONS as readonly string[]).includes(l)) : cur.location);
  if (role === "manager" && locations.length === 0) throw new Error("A store manager must have at least one location.");

  if (patch.password) {
    const { salt, hash } = makeHash(patch.password);
    const r = await query<Row>(
      `UPDATE public.users SET user_name=$2, user_email=$3, access=$4, password_salt=$5, password_hash=$6, location=$7, last_update=now() WHERE u_id=$1 RETURNING *`,
      [id, name, email, toDbAccess(role), salt, hash, locations]
    );
    return toPublic(r[0]);
  }
  const r = await query<Row>(
    `UPDATE public.users SET user_name=$2, user_email=$3, access=$4, location=$5, last_update=now() WHERE u_id=$1 RETURNING *`,
    [id, name, email, toDbAccess(role), locations]
  );
  return toPublic(r[0]);
}
