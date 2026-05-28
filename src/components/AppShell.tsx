import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield, LayoutDashboard, Ticket, Users, BarChart3, Inbox, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem { to: string; label: string; icon: any; }

const customerNav: NavItem[] = [
  { to: "/portal", label: "My tickets", icon: Ticket },
  { to: "/portal/new", label: "New ticket", icon: Plus },
];
const staffNav: NavItem[] = [
  { to: "/staff", label: "Inbox", icon: Inbox },
  { to: "/staff/tickets", label: "All tickets", icon: Ticket },
];
const adminNav: NavItem[] = [
  { to: "/admin", label: "Analytics", icon: BarChart3 },
  { to: "/admin/tickets", label: "All tickets", icon: Ticket },
  { to: "/admin/users", label: "Users", icon: Users },
];

export function AppShell({ children, area }: { children: ReactNode; area: "portal" | "staff" | "admin" }) {
  const { user, signOut, isAdmin, isStaff } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();

  const items = area === "portal" ? customerNav : area === "staff" ? staffNav : adminNav;
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-primary/20 grid place-items-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            Helix Support
          </Link>
          <p className="mt-1 text-xs text-sidebar-foreground/60 capitalize">{area} workspace</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((i) => {
            const active = loc.pathname === i.to || (i.to !== "/portal" && i.to !== "/staff" && i.to !== "/admin" && loc.pathname.startsWith(i.to));
            return (
              <Link
                key={i.to}
                to={i.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <i.icon className="h-4 w-4" />
                {i.label}
              </Link>
            );
          })}

          {(isStaff || isAdmin) && area !== "staff" && (
            <Link to="/staff" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/60">
              <LayoutDashboard className="h-4 w-4" /> Staff workspace
            </Link>
          )}
          {isAdmin && area !== "admin" && (
            <Link to="/admin" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/60">
              <BarChart3 className="h-4 w-4" /> Admin workspace
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate">{user?.email}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={async () => { await signOut(); nav({ to: "/" }); }} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between border-b border-border p-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-sm">
            <Shield className="h-4 w-4 text-primary" /> Helix
          </Link>
          <Button size="sm" variant="ghost" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="md:hidden border-b border-border overflow-x-auto">
          <div className="flex gap-1 p-2">
            {items.map((i) => (
              <Link key={i.to} to={i.to} className="rounded-md px-3 py-1.5 text-xs whitespace-nowrap hover:bg-accent">
                {i.label}
              </Link>
            ))}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

export function RequireAuth({ children, role }: { children: ReactNode; role?: "staff" | "admin" }) {
  const { user, loading, isStaff, isAdmin } = useAuth();
  const nav = useNavigate();
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) { nav({ to: "/auth" }); return null; }
  if (role === "admin" && !isAdmin) { nav({ to: "/portal" }); return null; }
  if (role === "staff" && !isStaff) { nav({ to: "/portal" }); return null; }
  return <>{children}</>;
}
