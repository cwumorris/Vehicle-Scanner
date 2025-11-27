export interface Vehicle {
  code: string;
  approved: boolean;
  residentName?: string;
  block?: string;
  plateNumber?: string;
  carModel?: string;
  reason?: string;
}

export interface VehicleDatabase {
  [key: string]: Vehicle;
}
