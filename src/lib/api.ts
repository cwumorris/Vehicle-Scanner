export type Role = "admin" | "user";

export type Vehicle = {
  id: string;
  plate: string;
  make?: string;
  model?: string;
  owner_name: string;
  owner_unit?: string;
  owner_phone?: string;
  status: "active" | "inactive" | string;
  created_at?: string;
  expires_at?: string | null;
};

export type CheckResponse =
  | { approved: true; vehicle: Vehicle }
  | { approved: false; message?: string };

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

function getRoleHeader() {
  try {
    const raw = localStorage.getItem("s24_auth");
    if (!raw) return {};
    const auth = JSON.parse(raw) as { role?: Role };
    return auth?.role ? { "x-role": auth.role } : {};
  } catch {
    return {};
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...getRoleHeader(),
    },
    ...init,
  });
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const detail = (body as any)?.detail || (typeof body === "string" ? body : "Request failed");
    throw new Error(detail);
  }
  return body as T;
}

export const api = {
  check: (code: string) => request<CheckResponse>(`/api/check/${encodeURIComponent(code)}`),
  qr: (vehicleId: string) => request<{ qr: string }>(`/api/qrcode/${encodeURIComponent(vehicleId)}`),
  vehicles: {
    // Temporary until backend pagination is deployed
    listAll: () => request<Vehicle[]>(`/api/vehicles`),
    list: (params: { page?: number; limit?: number; q?: string; status?: Vehicle["status"] } = {}) => {
      const usp = new URLSearchParams();
      if (params.page) usp.set("page", String(params.page));
      if (params.limit) usp.set("limit", String(params.limit));
      if (params.q) usp.set("q", params.q);
      if (params.status) usp.set("status", params.status);
      const qs = usp.toString();
      return request<Paginated<Vehicle>>(`/api/vehicles${qs ? `?${qs}` : ""}`);
    },
    create: (payload: Omit<Vehicle, 'id' | 'created_at'>) => request<{ message: string; id: string }>(`/api/vehicles`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    update: (id: string, payload: Partial<Omit<Vehicle, 'id' | 'created_at'>>) => request<Vehicle>(`/api/vehicles/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    delete: (id: string) => request<{ message: string }>(`/api/vehicles/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
    toggleActive: (id: string) => request<{ id: string; status: Vehicle["status"]}>(`/api/vehicles/${encodeURIComponent(id)}/toggle`, {
      method: "PATCH",
    }),
  },
};
