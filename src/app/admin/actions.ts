"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { canDeleteUser } from "@/lib/auth";
import { createUser, deleteUser, setManagerLocations, updateUser, listUsers, findById, type Role } from "@/lib/users";
import { setOpenLocations, setGrouping } from "@/lib/settings";
import { LOCATIONS } from "@/lib/locations";

export type ActionState = { error?: string; ok?: string } | undefined;

export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireRole(["admin", "owner"]);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const password = String(formData.get("password") ?? "");
  const locations = formData.getAll("locations").map(String).filter((l) => (LOCATIONS as readonly string[]).includes(l));

  if (role !== "owner" && role !== "manager") return { error: "Choose a role (Owner or Manager)." };
  if (!email.includes("@")) return { error: "Enter a valid email." };
  if (password.length < 4) return { error: "Password must be at least 4 characters." };

  try {
    await createUser({ email, name, role, password, locations, createdBy: viewer.id });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create the user." };
  }
  revalidatePath("/admin");
  return { ok: `${role === "owner" ? "Owner" : "Manager"} ${email} added.` };
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const viewer = await requireRole(["admin", "owner"]);
  const id = String(formData.get("id") ?? "");
  const target = await findById(id);
  if (!target) return;
  if (!canDeleteUser(viewer, target)) return; // silently ignore disallowed (e.g. admin / self)
  await deleteUser(id);
  revalidatePath("/admin");
}

export async function setLocationsAction(formData: FormData): Promise<void> {
  await requireRole(["admin", "owner"]);
  const id = String(formData.get("id") ?? "");
  const target = await findById(id);
  if (!target || target.role !== "manager") return;
  const locations = formData.getAll("locations").map(String);
  await setManagerLocations(id, locations);
  revalidatePath("/admin");
}

export async function updateUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin", "owner"]);
  const id = String(formData.get("id") ?? "");
  const target = await findById(id);
  if (!target) return { error: "User not found." };
  if (target.role === "admin") return { error: "The admin account cannot be edited." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const password = String(formData.get("password") ?? "");
  const locations = formData.getAll("locations").map(String).filter((l) => (LOCATIONS as readonly string[]).includes(l));

  if (role !== "owner" && role !== "manager") return { error: "Role must be Owner or Manager." };
  if (email && !email.includes("@")) return { error: "Enter a valid email." };
  if (password && password.length < 4) return { error: "Password must be at least 4 characters." };

  try {
    await updateUser(id, { name, email, role, password: password || undefined, locations });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update the user." };
  }
  revalidatePath("/admin");
  return { ok: "Saved." };
}

type EditRows = Record<string, Record<string, { a: string; b: string }>>;
function parseRows(formData: FormData): EditRows {
  try { return JSON.parse(String(formData.get("data") ?? "{}")) as EditRows; } catch { return {}; }
}
function buildMap(rows: Record<string, { a: string; b: string }> | undefined, aKey: "channel" | "category") {
  const out: Record<string, { sub: string } & Record<string, string>> = {};
  for (const [value, e] of Object.entries(rows ?? {})) {
    const a = (e.a ?? "").trim();
    if (a) out[value] = { [aKey]: a, sub: (e.b ?? "").trim() } as never;
  }
  return out;
}

export async function saveChannelsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin", "owner"]);
  const rows = parseRows(formData);
  await setGrouping({
    channelByMenu: buildMap(rows.channelByMenu, "channel") as never,
    channelByDining: buildMap(rows.channelByDining, "channel") as never,
  });
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: "Channel mapping saved." };
}

export async function saveCategoriesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin", "owner"]);
  const rows = parseRows(formData);
  await setGrouping({ categoryByGroup: buildMap(rows.categoryByGroup, "category") as never });
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: "Category mapping saved." };
}

export async function setOpenLocationsAction(formData: FormData): Promise<void> {
  await requireRole(["admin", "owner"]);
  const locations = formData.getAll("open").map(String);
  await setOpenLocations(locations);
  revalidatePath("/admin");
  revalidatePath("/");
}

// Helper for the page (keeps admin invisible to non-admins is handled in the page via visibleUsers).
export async function allUsers() {
  return listUsers();
}
