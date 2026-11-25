import { Suspense } from "react";
import { requireUser, canAccessAdminPanel } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

export default function Page() {
  // The session read (cookies + token expiry vs current time) must sit behind a
  // Suspense boundary under Cache Components.
  return (
    <Suspense fallback={<div className="boot">Loading…</div>}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const user = await requireUser();
  return (
    <DashboardClient
      user={{ name: user.name, email: user.email, role: user.role }}
      canAdmin={canAccessAdminPanel(user.role)}
    />
  );
}
