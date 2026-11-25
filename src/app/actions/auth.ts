"use server";

import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/users";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/";

  if (!email || !password) return { error: "Enter your email and password." };

  const user = await verifyCredentials(email, password);
  if (!user) return { error: "Incorrect email or password." };

  await setSessionCookie(user);
  // Only allow same-site relative redirects.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
