import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { NewTicket } from "../portal/new";

export const Route = createFileRoute("/staff/new")({
  head: () => ({ meta: [{ title: "New internal ticket — Helix Staff" }] }),
  component: () => (
    <RequireAuth role="staff">
      <AppShell area="staff"><NewTicket audience="staff" /></AppShell>
    </RequireAuth>
  ),
});
