import { VehicleDatabase } from "@/types/vehicle";

export const vehicleDatabase: VehicleDatabase = {
  "S24-037": {
    code: "S24-037",
    approved: true,
    residentName: "Chukwu Emeka",
    block: "Block B12",
    plateNumber: "ABC-123-XY",
    carModel: "Toyota Camry 2022",
  },
  "S24-001": {
    code: "S24-001",
    approved: true,
    residentName: "Adebayo Oluwaseun",
    block: "Block A5",
    plateNumber: "DEF-456-ZW",
    carModel: "Honda Accord 2021",
  },
  "S24-012": {
    code: "S24-012",
    approved: true,
    residentName: "Okonkwo Grace",
    block: "Block C8",
    plateNumber: "GHI-789-UV",
    carModel: "Mercedes-Benz C300",
  },
  "S24-099": {
    code: "S24-099",
    approved: false,
    reason: "Vehicle not registered",
  },
  "S24-666": {
    code: "S24-666",
    approved: false,
    reason: "Blacklisted - Security alert",
  },
};

export const lookupVehicle = (code: string) => {
  const normalizedCode = code.trim().toUpperCase();
  return vehicleDatabase[normalizedCode] || null;
};
