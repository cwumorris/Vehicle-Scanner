import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "@/lib/api";

function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newUser, setNewUser] = useState<{
    username: string;
    password: string;
    role: "admin" | "guard";
    first_name?: string;
    last_name?: string;
  }>({ username: "", password: "", role: "guard", first_name: "", last_name: "" });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.users.list();
      return res.items;
    },
  });

  const generatePassword = () => {
    const length = 12;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < length; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser({ ...newUser, password: pwd });
    try {
      navigator.clipboard.writeText(pwd);
      toast({ title: "Password generated", description: "Password copied to clipboard" });
    } catch {
      toast({ title: "Password generated", description: "Copy failed; you can copy it from the field" });
    }
  };

  const createUserMutation = useMutation({
    mutationFn: async (payload: {
      username: string;
      password: string;
      role: "admin" | "guard";
      first_name?: string;
      last_name?: string;
    }) => api.users.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setNewUser({ username: "", password: "", role: "guard", first_name: "", last_name: "" });
      toast({ title: "User created", description: "New user added successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error creating user", description: err?.message || "Error – check terminal", variant: "destructive" as any });
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: async (id: number) => api.users.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      toast({ title: "Error updating user", description: err?.message || "Error – check terminal", variant: "destructive" as any });
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage administrators and security guards.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* Add user */}
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="border-b border-border px-4 md:px-6 py-3 text-sm font-semibold">Add User</div>
            <form
              className="p-4 md:p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createUserMutation.mutate(newUser);
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">First name</label>
                  <input
                    value={newUser.first_name || ""}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Last name</label>
                  <input
                    value={newUser.last_name || ""}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Username</label>
                <input
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span>Password</span>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-xs font-medium text-blue-500 hover:text-blue-400"
                  >
                    Generate
                  </button>
                </label>
                <input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "admin" | "guard" })}
                  className="w-full h-10 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring"
                >
                  <option value="guard">Security Guard</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={createUserMutation.isPending}
                className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60"
              >
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>

          {/* Existing users */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="border-b border-border px-4 md:px-6 py-3 text-sm font-semibold flex items-center justify-between">
              <span>Existing Users</span>
            </div>
            <div className="p-4 md:p-6">
              {usersQuery.isLoading && <div className="text-sm text-muted-foreground">Loading users...</div>}
              {usersQuery.isError && (
                <div className="text-sm text-red-600">Error loading users. Ensure you are logged in as admin.</div>
              )}
              {usersQuery.data && usersQuery.data.length === 0 && (
                <div className="text-sm text-muted-foreground">No users yet.</div>
              )}
              {usersQuery.data && usersQuery.data.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-2">Username</th>
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Role</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersQuery.data.map((u: User) => (
                      <tr key={u.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-2">{u.username}</td>
                        <td className="py-2 pr-2">
                          {u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : "-"}
                        </td>
                        <td className="py-2 pr-2 capitalize">{u.role}</td>
                        <td className="py-2 pr-2 text-xs">
                          {u.active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <button
                            type="button"
                            disabled={toggleUserMutation.isPending}
                            onClick={() => toggleUserMutation.mutate(u.id)}
                            className="inline-flex items-center px-3 py-1 rounded-md border border-border text-xs font-medium hover:bg-accent"
                          >
                            {u.active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Users;
