import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

function Dashboard() {
  const vehiclesQuery = useQuery({
    queryKey: ["dashboard", "vehicles"],
    queryFn: async () => {
      // Use small page size; we only care about total
      const res = await api.vehicles.list({ page: 1, limit: 1 });
      return res.total;
    },
  });

  const usersQuery = useQuery({
    queryKey: ["dashboard", "users"],
    queryFn: async () => {
      const res = await api.users.list();
      return res.items.length;
    },
  });

  const vehiclesTotal = vehiclesQuery.data ?? 0;
  const usersTotal = usersQuery.data ?? 0;
  const maxValue = Math.max(vehiclesTotal, usersTotal, 1);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of vehicles and users in the system.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">Total Vehicles</div>
            <div className="text-3xl font-bold">
              {vehiclesQuery.isLoading ? "-" : vehiclesTotal}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">Total Users</div>
            <div className="text-3xl font-bold">
              {usersQuery.isLoading ? "-" : usersTotal}
            </div>
          </div>
        </div>

        {/* Simple bar chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-sm font-semibold mb-4">Entities overview</div>
          <div className="flex items-end gap-6 h-40">
            <div className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-10 rounded-t-md bg-blue-600 transition-all"
                style={{ height: `${(vehiclesTotal / maxValue) * 100}%` }}
              />
              <div className="text-xs text-muted-foreground">Vehicles</div>
              <div className="text-sm font-semibold">{vehiclesTotal}</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-10 rounded-t-md bg-emerald-600 transition-all"
                style={{ height: `${(usersTotal / maxValue) * 100}%` }}
              />
              <div className="text-xs text-muted-foreground">Users</div>
              <div className="text-sm font-semibold">{usersTotal}</div>
            </div>
          </div>
          {(vehiclesQuery.isLoading || usersQuery.isLoading) && (
            <div className="mt-4 text-xs text-muted-foreground">Loading data...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
