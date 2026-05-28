import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { TicketDetail } from "../portal/ticket.$id";

export const Route = createFileRoute("/staff/ticket/$id")({
  head: () => ({ meta: [{ title: "Ticket — Helix Staff" }] }),
  component: () => <RequireAuth role="staff"><AppShell area="staff"><TicketDetail backTo="/staff" /></AppShell></RequireAuth>,
});
