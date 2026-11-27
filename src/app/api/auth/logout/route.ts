import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

// Sign out via a plain POST form (used by the dashboard sidebar, which is
// rendered by the engine and can't call the logout server action directly).
export async function POST(req: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
