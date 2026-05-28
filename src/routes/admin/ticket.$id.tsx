import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { TicketDetail } from "../portal/ticket.$id";

export const Route = createFileRoute("/admin/ticket/$id")({
  head: () => ({ meta: [{ title: "Ticket — Helix Admin" }] }),
  component: () => <RequireAuth role="admin"><AppShell area="admin"><TicketDetail backTo="/admin/tickets" /></AppShell></RequireAuth>,
});
