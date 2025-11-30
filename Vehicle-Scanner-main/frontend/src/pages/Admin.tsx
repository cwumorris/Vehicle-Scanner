import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { api, type Vehicle } from "@/lib/api";
import { Copy, QrCode } from "lucide-react";

function Admin() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    plate: "",
    make: "",
    model: "",
    owner_name: "",
    owner_unit: "",
    owner_phone: "",
  });
  const [qrUrl, setQrUrl] = useState<string>("");
  const [newVehicleId, setNewVehicleId] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const createMutation = useMutation({
    mutationFn: async (payload: Vehicle) => {
      await api.vehicles.create(payload);
      const qrData = await api.qr(payload.id);
      return qrData.qr as string;
    },
    onError: (err: any) => {
      setError(err?.message || "Error – check terminal");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = "VEH-" + Date.now().toString(36).toUpperCase();
    try {
      const payload: Vehicle = { id: newId, ...form, status: "active" } as Vehicle;
      const qr = await createMutation.mutateAsync(payload);
      setNewVehicleId(newId);
      setQrUrl(qr);
      setShowSuccessModal(true);

      // Auto-download QR
      const link = document.createElement("a");
      link.href = qr;
      link.download = `${newId}-QR.png`;
      link.click();

      setForm({
        plate: "",
        make: "",
        model: "",
        owner_name: "",
        owner_unit: "",
        owner_phone: "",
      });
    } catch (err: any) {
      setError(err?.message || "Error – check terminal");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground mt-1">Manage vehicles and security users.</p>
        </div>

        {/* Vehicle creation */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="border-b border-border px-4 md:px-6 py-3 text-sm font-semibold">Add New Vehicle</div>
          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Plate<span className="text-red-500"> *</span></label>
                <input
                  name="plate"
                  placeholder="KBA 123X"
                  value={form.plate}
                  onChange={handleChange}
                  required
                  className="w-full h-11 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Make</label>
                <input name="make" placeholder="Toyota" value={form.make} onChange={handleChange} className="w-full h-11 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Model</label>
                <input name="model" placeholder="Harrier" value={form.model} onChange={handleChange} className="w-full h-11 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Owner Name<span className="text-red-500"> *</span></label>
                <input name="owner_name" placeholder="John Doe" value={form.owner_name} onChange={handleChange} required className="w-full h-11 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Unit/House</label>
                <input name="owner_unit" placeholder="Block A-101" value={form.owner_unit} onChange={handleChange} className="w-full h-11 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Phone</label>
                <input name="owner_phone" placeholder="07xx xxx xxx" value={form.owner_phone} onChange={handleChange} className="w-full h-11 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring" />
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={createMutation.isPending}
                type="submit"
                className="inline-flex items-center justify-center h-11 px-5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-60 active:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-400/40"
              >
                Add Vehicle & Download QR
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center p-4 z-50">
          <div className="bg-card text-foreground border border-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Vehicle Added Successfully!</h3>
                <p className="text-sm text-muted-foreground mt-1">ID: {newVehicleId}</p>
              </div>
              
              {qrUrl && (
                <div className="flex justify-center">
                  <img 
                    src={qrUrl} 
                    alt="Vehicle QR Code" 
                    className="w-48 h-48 rounded border border-border bg-background" 
                  />
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(newVehicleId);
                      toast({ title: "Copied", description: "Vehicle ID copied to clipboard." });
                    } catch {}
                  }}
                  className="flex-1 h-10 px-4 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-500 active:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy ID
                </button>
                <button
                  onClick={() => {
                    window.location.href = `/app/scanner?code=${encodeURIComponent(newVehicleId)}`;
                  }}
                  className="flex-1 h-10 px-4 rounded-md bg-green-600 text-white font-medium hover:bg-green-500 active:bg-green-700 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  Open Scanner
                </button>
              </div>
              
              <div className="pt-2">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full h-10 px-4 rounded-md border border-border text-foreground font-medium hover:bg-accent"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
