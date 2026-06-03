import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Shield, LayoutDashboard, Ticket, Users, BarChart3, Inbox, LogOut, Plus,
  UserRound, Headphones, ShieldCheck, TrendingUp, FileText, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem { to: string; label: string; icon: any; }

const customerNav: NavItem[] = [
  { to: "/portal", label: "My tickets", icon: Ticket },
  { to: "/portal/new", label: "New ticket", icon: Plus },
];
const staffNav: NavItem[] = [
  { to: "/staff", label: "Inbox", icon: Inbox },
  { to: "/staff/tickets", label: "All tickets", icon: Ticket },
  { to: "/staff/new", label: "New internal ticket", icon: Plus },
];
const adminNav: NavItem[] = [
  { to: "/admin", label: "Analytics", icon: BarChart3 },
  { to: "/admin/staff-performance", label: "Staff performance", icon: TrendingUp },
  { to: "/admin/reports", label: "Reports", icon: FileText },
  { to: "/admin/tickets", label: "All tickets", icon: Ticket },
  { to: "/admin/users", label: "Users", icon: Users },
];

type Area = "portal" | "staff" | "admin";

const THEME: Record<Area, {
  label: string;
  sub: string;
  icon: any;
  // tailwind classes
  bar: string;       // top banner background
  barText: string;
  sidebar: string;   // sidebar gradient/background override
  chip: string;      // role chip
  logoWrap: string;
}> = {
  portal: {
    label: "Customer portal",
    sub: "Submit and track your support tickets",
    icon: UserRound,
    bar: "bg-gradient-to-r from-sky-600 to-blue-700",
    barText: "text-white",
    sidebar: "bg-slate-900",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    logoWrap: "bg-sky-500/20 text-sky-300",
  },
  staff: {
    label: "Staff workspace",
    sub: "Triage, respond, and resolve customer tickets",
    icon: Headphones,
    bar: "bg-gradient-to-r from-emerald-600 to-teal-700",
    barText: "text-white",
    sidebar: "bg-[oklch(0.18_0.04_165)]",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    logoWrap: "bg-emerald-500/20 text-emerald-300",
  },
  admin: {
    label: "Admin console",
    sub: "Full control · analytics, users, and ticket administration",
    icon: ShieldCheck,
    bar: "bg-gradient-to-r from-violet-700 via-fuchsia-700 to-rose-700",
    barText: "text-white",
    sidebar: "bg-[oklch(0.15_0.05_300)]",
    chip: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30",
    logoWrap: "bg-fuchsia-500/20 text-fuchsia-200",
  },
};

export function AppShell({ children, area }: { children: ReactNode; area: Area }) {
  const { user, signOut, isAdmin, isStaff } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();

  const items = area === "portal" ? customerNav : area === "staff" ? staffNav : adminNav;
  const t = THEME[area];
  const Icon = t.icon;
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className={cn("hidden md:flex w-64 flex-col text-sidebar-foreground border-r border-sidebar-border", t.sidebar)}>
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 font-semibold text-white">
            <div className={cn("h-8 w-8 rounded-lg grid place-items-center", t.logoWrap)}>
              <Shield className="h-4 w-4" />
            </div>
            Helix Support
          </Link>
          <div className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", t.chip)}>
            <Icon className="h-3 w-3" /> {t.label}
          </div>
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
                  active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <i.icon className="h-4 w-4" />
                {i.label}
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-white/10">
            <button
              onClick={async () => { await signOut(); nav({ to: "/auth" }); }}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white"
              title="Sign in as a different role"
            >
              <LogOut className="h-3.5 w-3.5" /> Switch dashboard (sign in again)
            </button>
          </div>
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-white/15 text-white">{initials}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate text-white/90">{user?.email}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wide">{area === "portal" ? "Customer" : area === "staff" ? "Staff" : "Admin"}</p>
            </div>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={async () => { await signOut(); nav({ to: "/" }); }} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Role banner — visually distinct per workspace */}
        <div className={cn("flex items-center justify-between gap-3 px-4 md:px-6 py-3", t.bar, t.barText)}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-white/15 grid place-items-center shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">{t.label}</p>
              <p className="text-[11px] text-white/80 leading-tight truncate">{t.sub}</p>
            </div>
          </div>
          <Badge variant="outline" className="border-white/40 text-white bg-white/10 hidden sm:inline-flex">
            {area === "admin" ? "Full access" : area === "staff" ? "Agent access" : "Customer access"}
          </Badge>
        </div>

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
