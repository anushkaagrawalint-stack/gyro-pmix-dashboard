import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Gyro Republic" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // searchParams is request data — read it behind a Suspense boundary (Cache Components).
  return (
    <Suspense fallback={null}>
      <Resolve sp={searchParams} />
    </Suspense>
  );
}

async function Resolve({ sp }: { sp: Promise<{ next?: string }> }) {
  const { next } = await sp;
  const safe = typeof next === "string" && next.startsWith("/") ? next : "/";
  return <LoginForm next={safe} />;
}
