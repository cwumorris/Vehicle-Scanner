export type Role = "admin" | "user";

const USERS: Record<string, { password: string; role: Role }> = {
  admin: { password: "admin123", role: "admin" },
  guard: { password: "guard123", role: "user" },
};

export type AuthState = {
  username: string;
  role: Role;
};

const STORAGE_KEY = "s24_auth";

export function login(username: string, password: string): AuthState | null {
  const u = USERS[username];
  if (u && u.password === password) {
    const auth: AuthState = { username, role: u.role };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    return auth;
  }
  return null;
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAuth();
}
