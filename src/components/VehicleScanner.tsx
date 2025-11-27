import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";
import { lookupVehicle } from "@/data/vehicleDatabase";
import { Vehicle } from "@/types/vehicle";

type ScanStatus = "idle" | "approved" | "rejected";

export const VehicleScanner = () => {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [vehicleData, setVehicleData] = useState<Vehicle | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount and after each scan
  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  // Auto-clear after 4 seconds
  useEffect(() => {
    if (status !== "idle") {
      const timer = setTimeout(() => {
        setStatus("idle");
        setCode("");
        setVehicleData(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const vehicle = lookupVehicle(code);
    
    if (vehicle) {
      setVehicleData(vehicle);
      setStatus(vehicle.approved ? "approved" : "rejected");
    } else {
      setVehicleData({ 
        code, 
        approved: false, 
        reason: "Vehicle not registered" 
      });
      setStatus("rejected");
    }
  };

  const getBackgroundClass = () => {
    switch (status) {
      case "approved":
        return "bg-status-approved-bg";
      case "rejected":
        return "bg-status-rejected-bg";
      default:
        return "bg-background";
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors duration-instant ${getBackgroundClass()}`}
    >
      <div className="w-full max-w-2xl px-4">
        {status === "idle" && (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
                SQUARD24
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Scan or enter vehicle code
              </p>
            </div>
            <Input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="S24-XXX"
              className="h-20 md:h-24 text-3xl md:text-4xl text-center font-bold tracking-wider bg-input border-2 border-border focus-visible:ring-4 focus-visible:ring-ring"
              autoComplete="off"
              autoFocus
            />
            <p className="text-center text-sm text-muted-foreground">
              Press ENTER to scan
            </p>
          </form>
        )}

        {status === "approved" && vehicleData && (
          <div className="text-center space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-center">
              <div className="rounded-full bg-white p-8">
                <Check className="w-24 h-24 md:w-32 md:h-32 text-status-approved-bg stroke-[3]" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-5xl md:text-7xl font-bold text-white">
                APPROVED
              </h2>
              <div className="text-2xl md:text-3xl text-white font-semibold space-y-1">
                <p>{vehicleData.residentName}</p>
                <p className="text-xl md:text-2xl">{vehicleData.block}</p>
              </div>
              <div className="text-lg md:text-xl text-white/90 space-y-1 pt-4">
                <p>{vehicleData.plateNumber}</p>
                <p>{vehicleData.carModel}</p>
              </div>
            </div>
          </div>
        )}

        {status === "rejected" && vehicleData && (
          <div className="text-center space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-center">
              <div className="rounded-full bg-white p-8">
                <X className="w-24 h-24 md:w-32 md:h-32 text-status-rejected-bg stroke-[3]" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-5xl md:text-7xl font-bold text-white">
                REJECTED
              </h2>
              <p className="text-xl md:text-2xl text-white/90 font-medium">
                {vehicleData.reason || "Access denied"}
              </p>
              <p className="text-lg text-white/80">
                Code: {vehicleData.code}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
