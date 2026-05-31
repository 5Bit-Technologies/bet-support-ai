import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Helix Support" }] }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(8).max(72);
const nameSchema = z.string().trim().min(1).max(100);

function routeFor(role: AppRole) {
  return role === "admin" ? "/admin" : role === "staff" ? "/staff" : "/portal";
}

function AuthPage() {
  const { user, loading, roles } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && user) {
      const target = roles.includes("admin") ? "/admin" : roles.includes("staff") ? "/staff" : "/portal";
      nav({ to: target });
    }
  }, [user, loading, roles, nav]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="h-8 w-8 rounded-lg bg-primary/20 grid place-items-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          Helix Support
        </Link>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">AI-powered ticket operations for regulated gaming.</h2>
          <p className="mt-4 text-sidebar-foreground/70 max-w-md">
            Triage, route, and resolve customer issues — withdrawals, KYC, betting disputes — with real-time AI assistance.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">© {new Date().getFullYear()} Helix Support</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to your workspace or create a new account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin"><SignInForm /></TabsContent>
              <TabsContent value="signup"><SignUpForm /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RoleSelect({ value, onChange }: { value: AppRole; onChange: (v: AppRole) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AppRole)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="customer">Customer</SelectItem>
        <SelectItem value="staff">Staff</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}

function SignInForm() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ev = emailSchema.safeParse(email);
    const pv = passwordSchema.safeParse(password);
    if (!ev.success || !pv.success) return toast.error("Enter a valid email and password (min 8 chars).");
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: ev.data, password: pv.data });
    if (error || !data.user) { setBusy(false); return toast.error(error?.message ?? "Sign-in failed"); }

    // Route based on the account's ACTUAL role, not a dropdown selection.
    const { data: rows } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const userRoles = (rows ?? []).map((r) => r.role as AppRole);
    const effective: AppRole = userRoles.includes("admin")
      ? "admin"
      : userRoles.includes("staff") ? "staff" : "customer";
    setBusy(false);
    toast.success(`Signed in as ${effective}`);
    nav({ to: routeFor(effective) });
  };

  return (
    <form onSubmit={submit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="si-pwd">Password</Label>
        <Input id="si-pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <p className="text-xs text-muted-foreground">You'll be taken to the dashboard that matches this account's role.</p>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("customer");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nv = nameSchema.safeParse(name);
    const ev = emailSchema.safeParse(email);
    const pv = passwordSchema.safeParse(password);
    if (!nv.success || !ev.success || !pv.success) return toast.error("Please check your details (password min 8 chars).");
    if (role !== "customer" && code.trim().length < 6) return toast.error("An access code is required for Staff and Admin signups.");

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: ev.data,
      password: pv.data,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: nv.data },
      },
    });
    if (error) { setBusy(false); return toast.error(error.message); }

    // If staff/admin, we need an active session to call the RPC. If signUp didn't
    // return a session (email-confirm enabled), try an immediate sign-in.
    let session = data.session;
    if (role !== "customer" && !session) {
      const { data: si } = await supabase.auth.signInWithPassword({ email: ev.data, password: pv.data });
      session = si.session;
    }

    if (role !== "customer") {
      if (!session) {
        setBusy(false);
        return toast.error("Account created. Please confirm your email, sign in, then re-submit your access code via the admin team.");
      }
      const { error: rpcErr } = await supabase.rpc("claim_signup_role", { _role: role, _code: code.trim() });
      if (rpcErr) {
        setBusy(false);
        return toast.error(`Role claim failed: ${rpcErr.message}`);
      }
    }
    setBusy(false);
    toast.success(
      session
        ? `Account created. Welcome to the ${role} workspace.`
        : "Account created. Check your email to confirm, then sign in.",
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label>Account type</Label>
        <RoleSelect value={role} onChange={setRole} />
        {role !== "customer" && (
          <p className="text-xs text-muted-foreground">
            {role === "staff" ? "Staff" : "Admin"} signups require an access code provided by your operations lead.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-name">Full name</Label>
        <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-pwd">Password</Label>
        <Input id="su-pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </div>
      {role !== "customer" && (
        <div className="space-y-2">
          <Label htmlFor="su-code">Access code</Label>
          <Input id="su-code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="e.g. HELIX-STAFF-2026" />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
    </form>
  );
}
