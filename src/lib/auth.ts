import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signToken, verifyToken, type SessionPayload } from "./session";
import { findById, type PublicUser, type Role } from "./users";

// ── cookie management ──
export async function setSessionCookie(user: PublicUser): Promise<void> {
  const token = signToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  // Verifying the token compares its expiry against Date.now(); mark this as
  // request-time so Cache Components doesn't try to prerender it.
  await connection();
  return verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
}

// Fresh user from the store (role/locations reflect the latest admin changes).
// Returns null if the session is gone or the user was deleted.
export async function getCurrentUser(): Promise<PublicUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  return findById(payload.sub);
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role[]): Promise<PublicUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

// ── authorization rules ──

// Admin is invisible to owner and manager.
export function visibleUsers(viewer: PublicUser, all: PublicUser[]): PublicUser[] {
  if (viewer.role === "admin") return all;
  return all.filter((u) => u.role !== "admin");
}

// Who may open the admin panel at all.
export function canAccessAdminPanel(role: Role): boolean {
  return role === "admin" || role === "owner";
}

// Owner may add owners + managers; admin may too. Nobody adds another admin via the panel.
export function canCreateUsers(role: Role): boolean {
  return role === "admin" || role === "owner";
}

// Owner may delete anyone except admin (and never sees admin). Admin may delete non-admins.
export function canDeleteUser(viewer: PublicUser, target: PublicUser): boolean {
  if (target.role === "admin") return false; // admin is never deletable
  if (viewer.id === target.id) return false; // don't delete yourself
  return viewer.role === "admin" || viewer.role === "owner";
}

export function canEditManagerLocations(role: Role): boolean {
  return role === "admin" || role === "owner";
}
