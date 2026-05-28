import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { TicketsTable } from "@/components/TicketsTable";

export const Route = createFileRoute("/admin/tickets")({
  head: () => ({ meta: [{ title: "All tickets — Helix Admin" }] }),
  component: () => <RequireAuth role="admin"><AppShell area="admin">
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">All tickets</h1>
      <TicketsTable basePath="/admin/ticket" />
    </div>
  </AppShell></RequireAuth>,
});
