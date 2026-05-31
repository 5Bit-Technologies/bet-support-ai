import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { TicketsTable } from "@/components/TicketsTable";

export const Route = createFileRoute("/staff/tickets")({
  head: () => ({ meta: [{ title: "All tickets — Helix Staff" }] }),
  component: () => <RequireAuth role="staff"><AppShell area="staff">
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Internal tickets</h1>
      <TicketsTable basePath="/staff/ticket" audience="staff" />
    </div>
  </AppShell></RequireAuth>,
});
