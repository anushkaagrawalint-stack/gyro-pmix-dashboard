import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { LOCATIONS } from "./locations";

// ─────────────────────────────────────────────────────────────────────────────
// User store. Local JSON file for now (no Neon writes yet) — all access goes
// through these functions so the backing store can be swapped to Neon later
// without touching callers. Seeds the 3 dummy users on first run.
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "admin" | "owner" | "manager";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  locations: string[]; // which locations this user may view (managers only; owner/admin see all)
  createdAt: string;
  createdBy: string | null;
};

export type PublicUser = Omit<User, "passwordHash">;

const DATA_FILE = path.join(process.cwd(), ".data", "auth.json");

// ── password hashing (scrypt, built-in — no external deps) ──
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// ── seed data: admin@kutlerri.ai / owner@... / manager@..., pass = <role>@123 ──
function seedUsers(): User[] {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      email: "admin@kutlerri.ai",
      name: "Admin",
      role: "admin",
      passwordHash: hashPassword("admin@123"),
      locations: [...LOCATIONS],
      createdAt: now,
      createdBy: null,
    },
    {
      id: crypto.randomUUID(),
      email: "owner@kutlerri.ai",
      name: "Owner",
      role: "owner",
      passwordHash: hashPassword("owner@123"),
      locations: [...LOCATIONS],
      createdAt: now,
      createdBy: null,
    },
    {
      id: crypto.randomUUID(),
      email: "manager@kutlerri.ai",
      name: "Store Manager",
      role: "manager",
      // demo subset — owner can change which locations this manager sees
      passwordHash: hashPassword("manager@123"),
      locations: ["Fondren", "Richmond", "Katy"],
      createdAt: now,
      createdBy: null,
    },
  ];
}

async function load(): Promise<User[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as User[];
  } catch {
    const seeded = seedUsers();
    await save(seeded);
    return seeded;
  }
}

async function save(users: User[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

const strip = (u: User): PublicUser => {
  const { passwordHash: _ph, ...rest } = u;
  void _ph;
  return rest;
};

// ── reads ──
export async function listUsers(): Promise<PublicUser[]> {
  return (await load()).map(strip);
}

export async function findById(id: string): Promise<PublicUser | null> {
  const u = (await load()).find((x) => x.id === id);
  return u ? strip(u) : null;
}

export async function verifyCredentials(email: string, password: string): Promise<PublicUser | null> {
  const u = (await load()).find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u) return null;
  return verifyPasswordHash(password, u.passwordHash) ? strip(u) : null;
}

// ── writes ──
export async function createUser(input: {
  email: string;
  name: string;
  role: Exclude<Role, "admin">; // nobody creates another admin through the panel
  password: string;
  locations?: string[];
  createdBy: string;
}): Promise<PublicUser> {
  const users = await load();
  const email = input.email.trim().toLowerCase();
  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("A user with that email already exists.");
  }
  const locs = input.role === "manager" ? (input.locations ?? []).filter((l) => (LOCATIONS as readonly string[]).includes(l)) : [...LOCATIONS];
  const user: User = {
    id: crypto.randomUUID(),
    email,
    name: input.name.trim() || email,
    role: input.role,
    passwordHash: hashPassword(input.password),
    locations: locs,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };
  users.push(user);
  await save(users);
  return strip(user);
}

export async function deleteUser(id: string): Promise<void> {
  const users = await load();
  const target = users.find((u) => u.id === id);
  if (!target) throw new Error("User not found.");
  if (target.role === "admin") throw new Error("The admin account cannot be deleted.");
  await save(users.filter((u) => u.id !== id));
}

export async function setManagerLocations(id: string, locations: string[]): Promise<void> {
  const users = await load();
  const u = users.find((x) => x.id === id);
  if (!u) throw new Error("User not found.");
  if (u.role !== "manager") throw new Error("Only managers have per-location access.");
  u.locations = locations.filter((l) => (LOCATIONS as readonly string[]).includes(l));
  await save(users);
}
