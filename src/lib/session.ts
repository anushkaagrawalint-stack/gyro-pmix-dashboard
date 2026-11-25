import crypto from "node:crypto";
import type { Role } from "./users";

// Stateless, HMAC-signed session token (no external deps). Kept free of
// next/headers and "server-only" so it can also be verified inside proxy.ts.

export const SESSION_COOKIE = "gyro_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type SessionPayload = {
  sub: string; // user id
  email: string;
  name: string;
  role: Role;
  exp: number; // unix seconds
};

function secret(): Buffer {
  const s = process.env.SESSION_SECRET;
  // Dev fallback keeps local runs working if the env var is missing; a real
  // deployment must set SESSION_SECRET.
  return Buffer.from(s && s.length >= 16 ? s : "dev-insecure-session-secret-change-me", "utf8");
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

export function signToken(payload: Omit<SessionPayload, "exp"> & { exp?: number }): string {
  const full: SessionPayload = { ...payload, exp: payload.exp ?? Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const body = b64url(JSON.stringify(full));
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
