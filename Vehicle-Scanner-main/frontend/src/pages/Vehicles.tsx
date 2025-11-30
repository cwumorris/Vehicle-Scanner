import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api, type Vehicle, type Paginated } from "@/lib/api";
import { VehicleForm } from "@/components/VehicleForm";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { getAuth } from "@/lib/auth";

const PAGE_SIZE = 10;

const Vehicles = () => {
  const auth = getAuth();
  const isAdmin = auth?.role === "admin";
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, error, refetch } = useQuery<{ items: Vehicle[]; total: number; page: number; limit: number }, Error>({
    queryKey: ["vehicles", { page, q: debouncedQ, status }],
    queryFn: async () => {
      try {
        return await api.vehicles.list({ page, limit: PAGE_SIZE, q: debouncedQ, status: status === "all" ? undefined : status });
      } catch {
        // fallback to listAll
        const all = await api.vehicles.listAll();
        const byStatus = status === "all" ? all : all.filter(v => (v.status || "inactive") === status);
        const filtered = debouncedQ
          ? byStatus.filter(v => (v.id + " " + v.plate + " " + v.owner_name + " " + (v.owner_unit || "")).toLowerCase().includes(debouncedQ.toLowerCase()))
          : byStatus;
        const total = filtered.length;
        const start = (page - 1) * PAGE_SIZE;
        const items = filtered.slice(start, start + PAGE_SIZE);
        return { items, total, page, limit: PAGE_SIZE };
      }
    },
    placeholderData: keepPreviousData,
  });

  const pages = useMemo(() => Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE)), [data?.total]);

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.vehicles.toggleActive(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["vehicles"] });
      const prev = qc.getQueryData<any>(["vehicles", { page, q: debouncedQ, status }]);
      if (prev) {
        const next = {
          ...prev,
          items: prev.items.map((v: Vehicle) => (v.id === id ? { ...v, status: v.status === "active" ? "inactive" : "active" } : v)),
        };
        qc.setQueryData(["vehicles", { page, q: debouncedQ, status }], next);
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["vehicles", { page, q: debouncedQ, status }], ctx.prev);
      toast.error("Failed to update vehicle status");
    },
    onSuccess: (data) => {
      toast.success(`Vehicle ${data.status === "active" ? "activated" : "deactivated"} successfully`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.vehicles.delete(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["vehicles", { page, q: debouncedQ, status }] });
      const previousData = qc.getQueryData<Paginated<Vehicle>>(["vehicles", { page, q: debouncedQ, status }]);
      
      if (previousData) {
        qc.setQueryData(
          ["vehicles", { page, q: debouncedQ, status }],
          {
            ...previousData,
            items: previousData.items.filter((v) => v.id !== id),
            total: previousData.total - 1,
          }
        );
      }
      return { previousData };
    },
    onError: (error, _, context) => {
      toast.error("Failed to delete vehicle");
      if (context?.previousData) {
        qc.setQueryData(["vehicles", { page, q: debouncedQ, status }], context.previousData);
      }
    },
    onSuccess: () => {
      toast.success("Vehicle deleted successfully");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const saveMutation = useMutation<Vehicle, Error, Omit<Vehicle, 'id' | 'created_at'>>({
    mutationFn: async (data) => {
      if (editingVehicle) {
        return api.vehicles.update(editingVehicle.id, data);
      } else {
        const result = await api.vehicles.create(data);
        // Return a Vehicle-like object that includes the created ID
        return { ...data, id: result.id, created_at: new Date().toISOString() } as Vehicle;
      }
    },
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ["vehicles"] });
      const previousVehicles = qc.getQueryData<Paginated<Vehicle>>(["vehicles", { page, q: debouncedQ, status }]);
      
      if (editingVehicle && previousVehicles) {
        const updatedVehicles = {
          ...previousVehicles,
          items: previousVehicles.items.map(v => 
            v.id === editingVehicle.id ? { ...v, ...data } : v
          ),
        };
        qc.setQueryData(["vehicles", { page, q: debouncedQ, status }], updatedVehicles);
      }
      return { previousVehicles };
    },
    onError: (error, _data, context) => {
      toast.error(editingVehicle ? "Failed to update vehicle" : "Failed to create vehicle");
      if (context?.previousVehicles) {
        qc.setQueryData(["vehicles", { page, q: debouncedQ, status }], context.previousVehicles);
      }
    },
    onSuccess: (result) => {
      toast.success(editingVehicle ? "Vehicle updated successfully" : "Vehicle created successfully");
      setShowForm(false);
      setEditingVehicle(null);
      
      // If this was a create operation, invalidate the query to refetch the list
      if (!editingVehicle) {
        qc.invalidateQueries({ queryKey: ["vehicles"] });
      }
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this vehicle? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingVehicle(null);
    setShowForm(true);
  };

  const handleSave = async (data: Omit<Vehicle, 'id' | 'created_at'>) => {
    try {
      await saveMutation.mutateAsync(data, {
        onSuccess: () => {
          setShowForm(false);
          setEditingVehicle(null);
          toast.success(editingVehicle ? "Vehicle updated successfully" : "Vehicle created successfully");
        },
        onError: (error) => {
          toast.error(editingVehicle ? "Failed to update vehicle" : "Failed to create vehicle");
          console.error("Save error:", error);
        }
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className={isAdmin ? "max-w-5xl mx-auto" : "max-w-6xl ml-auto mr-4"}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Vehicles</h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin
                ? "Manage vehicle registrations and access."
                : "View registered vehicles. Contact an admin to make changes."}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              <span>Add Vehicle</span>
            </button>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-0 px-4 py-3 text-xs font-medium text-muted-foreground border-b border-border">
            <div className="col-span-3">Vehicle ID</div>
            <div className="col-span-2">Plate</div>
            <div className="col-span-2">Owner</div>
            <div className="col-span-3">Unit / Phone</div>
            <div className="col-span-2 text-right">{isAdmin ? "Status / Actions" : "Status"}</div>
          </div>
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
              className="h-9 rounded-md border border-border bg-input px-2 text-sm focus:outline-none focus:ring-4 focus:ring-ring"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setDebouncedQ((prev) => (prev !== q ? q : prev)); } }}
              placeholder="Search by ID, plate, owner or unit..."
              className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring"
            />
            <button
              onClick={() => { setPage(1); setDebouncedQ(q); }}
              className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-500"
            >Search</button>
          </div>
          {isLoading && (
            <div className="p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded my-2" />
              ))}
            </div>
          )}
          {error && (
            <div className="p-6 text-sm text-red-600">{error.message}</div>
          )}
          {!isLoading && !error && (data?.items?.length || 0) === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No vehicles found.</div>
          )}
          {!isLoading && !error && data?.items.map((v) => (
            <div key={v.id} className="grid grid-cols-12 gap-0 px-4 py-3 border-t border-border text-sm hover:bg-accent/10 transition-colors">
              <div className="col-span-2 font-mono text-xs md:text-sm truncate" title={v.id}>
                {v.id}
              </div>
              <div className="col-span-2 font-medium">{v.plate || "—"}</div>
              <div className="col-span-2">{v.owner_name}</div>
              <div className="col-span-3 text-muted-foreground truncate" title={`${v.owner_unit || ''} ${v.owner_phone ? `• ${v.owner_phone}` : ''}`}>
                {v.owner_unit || "—"} {v.owner_phone ? `• ${v.owner_phone}` : ""}
              </div>
              <div className="col-span-3 flex items-center justify-end gap-2">
                <span className={`inline-flex items-center h-6 px-2 rounded-md text-xs font-semibold ${v.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {v.status}
                </span>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(v)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                      title="Delete"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate(v.id)}
                      className={`px-2 text-xs h-6 rounded-md border ${v.status === 'active' ? 'text-amber-700 hover:bg-amber-50 border-amber-200' : 'text-green-700 hover:bg-green-50 border-green-200'}`}
                      disabled={toggleMutation.isPending}
                    >
                      {v.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!isLoading && !error && pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
              <div>Page {page} / {pages} • Total {data?.total || 0}</div>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 px-3 rounded-md border disabled:opacity-50">Prev</button>
                <button disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))} className="h-8 px-3 rounded-md border disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isAdmin && showForm && (
        <VehicleForm
          initialData={editingVehicle}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingVehicle(null);
          }}
          isSaving={saveMutation.isPending}
        />
      )}
    </div>
  );
};

export default Vehicles;
