"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { canDeleteUser } from "@/lib/auth";
import { createUser, deleteUser, setManagerLocations, listUsers, findById, type Role } from "@/lib/users";
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

// Helper for the page (keeps admin invisible to non-admins is handled in the page via visibleUsers).
export async function allUsers() {
  return listUsers();
}
