import React, { useState, useEffect } from "react";
import { Vehicle } from "@/lib/api";
import { X } from "lucide-react";

interface VehicleFormProps {
  initialData?: Vehicle | null;
  onSave: (data: Omit<Vehicle, 'id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({
  initialData,
  onSave,
  onCancel,
  isSaving,
}) => {
  const [formData, setFormData] = useState<Omit<Vehicle, 'id' | 'created_at'>>({
    plate: "",
    make: "",
    model: "",
    owner_name: "",
    owner_unit: "",
    owner_phone: "",
    status: "active",
    expires_at: "",
  });

  useEffect(() => {
    if (initialData) {
      const { id, created_at, ...rest } = initialData;
      setFormData(rest);
    } else {
      // Reset form when creating new vehicle
      setFormData({
        plate: "",
        make: "",
        model: "",
        owner_name: "",
        owner_unit: "",
        owner_phone: "",
        status: "active",
        expires_at: "",
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center md:justify-end md:pr-16 p-4 z-50">
      <div className="bg-card text-foreground border border-border rounded-xl p-6 w-full max-w-2xl relative shadow-xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          disabled={isSaving}
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold mb-6">
          {initialData ? "Edit Vehicle" : "Add New Vehicle"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="plate" className="block text-sm font-medium text-white mb-1">
              License Plate *
            </label>
            <input
              type="text"
              id="plate"
              name="plate"
              value={formData.plate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={isSaving}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="make" className="block text-sm font-medium text-white mb-1">
                Make
              </label>
              <input
                type="text"
                id="make"
                name="make"
                value={formData.make || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={isSaving}
              />
            </div>
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-white mb-1">
                Model
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={isSaving}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="owner_name" className="block text-sm font-medium text-white mb-1">
              Owner Name *
            </label>
            <input
              type="text"
              id="owner_name"
              name="owner_name"
              value={formData.owner_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={isSaving}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="owner_unit" className="block text-sm font-medium text-white mb-1">
                Unit
              </label>
              <input
                type="text"
                id="owner_unit"
                name="owner_unit"
                value={formData.owner_unit || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={isSaving}
              />
            </div>
            <div>
              <label htmlFor="owner_phone" className="block text-sm font-medium text-white mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="owner_phone"
                name="owner_phone"
                value={formData.owner_phone || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={isSaving}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-white mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={isSaving}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label htmlFor="expires_at" className="block text-sm font-medium text-white mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                id="expires_at"
                name="expires_at"
                value={formData.expires_at || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={isSaving}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
