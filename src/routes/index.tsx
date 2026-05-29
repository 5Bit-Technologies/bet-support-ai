import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Shield, Sparkles, Gauge, MessageSquare, BarChart3, Lock } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Helix Support — AI Ticket Operations for iGaming" },
      { name: "description", content: "Enterprise-grade AI support operations platform for regulated betting and gaming companies." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading, isStaff } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      nav({ to: isStaff ? "/staff" : "/portal" });
    }
  }, [user, loading, isStaff, nav]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 backdrop-blur-md bg-background/70 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            Helix Support
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button>Get started</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> AI triage built for regulated gaming
        </div>
        <h1 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight">
          Support operations,
          <span className="block bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">classified in seconds.</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          Helix routes every withdrawal, KYC, and betting dispute to the right team automatically — with sentiment, urgency, and a complete audit trail.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth"><Button size="lg">Open a ticket</Button></Link>
          <Link to="/auth"><Button size="lg" variant="outline">Login</Button></Link>

        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { icon: Sparkles, t: "AI classification", d: "Category, priority, sentiment and routing on submit." },
          { icon: Gauge, t: "Live dashboards", d: "KPIs, trends, workload — built for operations leads." },
          { icon: MessageSquare, t: "Unified inbox", d: "Customer replies, internal notes, attachments — one thread." },
          { icon: BarChart3, t: "Analytics", d: "AI accuracy, resolution time, escalation patterns." },
          { icon: Lock, t: "Role-based access", d: "Customer, Staff, Admin — enforced at the database." },
          { icon: Shield, t: "Compliance ready", d: "Full audit log, segregated internal notes, RLS." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition-shadow">
            <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center mb-4">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} Helix Support</span>
          <span>Enterprise AI for iGaming operations</span>
        </div>
      </footer>
    </div>
  );
}
