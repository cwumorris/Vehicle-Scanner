import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const SignIn = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = await login(username.trim(), password);
      // Redirect based on role
      if (auth.role === "admin") navigate("/app/admin", { replace: true });
      else navigate("/app/scanner", { replace: true });
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err?.message || "Invalid credentials",
        variant: "destructive" as any,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="text-muted-foreground mt-1">Use your assigned credentials to access Squard24</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring"
                placeholder="Enter your username"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center w-full h-11 px-5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-500 active:bg-blue-700 disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
