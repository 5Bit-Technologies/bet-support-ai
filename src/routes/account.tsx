import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, UserRound } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account — Helix Support" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { isAdmin, isStaff } = useAuth();
  const area = isAdmin ? "admin" : isStaff ? "staff" : "portal";
  return (
    <RequireAuth>
      <AppShell area={area as "portal" | "staff" | "admin"}>
        <Account />
      </AppShell>
    </RequireAuth>
  );
}

const pwdSchema = z.string().min(8).max(72);

function Account() {
  const { user, roles } = useAuth();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const role = roles.includes("admin") ? "Admin" : roles.includes("staff") ? "Staff" : "Customer";

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = pwdSchema.safeParse(pwd);
    if (!v.success) return toast.error("Password must be at least 8 characters.");
    if (pwd !== confirm) return toast.error("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPwd(""); setConfirm("");
    toast.success("Password updated.");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">Manage your sign-in details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><UserRound className="h-4 w-4" /> Profile</CardTitle>
          <CardDescription>Read-only details for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span>{role}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change password</CardTitle>
          <CardDescription>Use a strong password you don't use anywhere else (min 8 chars).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="new-pwd">New password</Label>
              <Input id="new-pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} minLength={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pwd">Confirm new password</Label>
              <Input id="confirm-pwd" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
