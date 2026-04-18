"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User { id: string; email: string; }

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}>({ user: null, loading: true, login: async () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const stored = localStorage.getItem("user");
    if (token && stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { api } = await import("@/lib/api");
    const data = await api.login(email, password);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
