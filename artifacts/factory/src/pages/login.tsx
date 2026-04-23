import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Factory, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [role, setRole] = useState<"owner" | "manager">("owner");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { role, password } },
      {
        onSuccess: async () => {
          await qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          navigate("/");
        },
        onError: () => {
          toast({ title: "Sign-in failed", description: "Please check your password and try again.", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary-foreground/15 flex items-center justify-center">
            <Factory className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Factory Manager</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Run the floor with the same calm precision as the foreman.
          </h1>
          <p className="text-primary-foreground/80 max-w-md">
            Track attendance, salaries, advances and copper purchases — all in one quiet, focused place.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Default — Owner: owner123 · Manager: manager123
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/60 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="lg:hidden flex items-center gap-2 mb-2">
              <Factory className="h-5 w-5 text-primary" />
              <span className="font-semibold">Factory Manager</span>
            </div>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Choose your role to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-2 rounded-md border p-1 bg-muted/40">
                {(["owner", "manager"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`text-sm py-2 rounded-sm font-medium transition-colors capitalize ${
                      role === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Sign in as ${role}`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
