export type Role = "admin" | "user" | "guard";

export type AuthState = {
  username: string;
  role: Role;
};

const STORAGE_KEY = "s24_auth";

import { api } from "./api";

export async function login(username: string, password: string): Promise<AuthState> {
  const res = await api.login(username, password);
  const auth: AuthState = { username: res.username, role: res.role as Role };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  return auth;
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
