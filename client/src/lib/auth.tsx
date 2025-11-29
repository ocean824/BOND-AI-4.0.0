import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for admin token first, then regular user token
    const adminToken = localStorage.getItem("admin_token");
    const userToken = localStorage.getItem("auth_token");
    
    if (adminToken) {
      // Verify admin token and get real admin user
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user && data.user.role === "admin") {
            setUser(data.user);
          } else {
            localStorage.removeItem("admin_token");
            // Fall back to regular user token if admin token is invalid
            if (userToken) {
              return fetch("/api/auth/me", {
                headers: { Authorization: `Bearer ${userToken}` },
              }).then((res) => res.json());
            }
          }
          return data;
        })
        .then((data) => {
          if (data?.user && !data.user.role) {
            setUser(data.user);
          } else if (data && !data.user) {
            localStorage.removeItem("auth_token");
          }
        })
        .catch(() => {
          localStorage.removeItem("admin_token");
          localStorage.removeItem("auth_token");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (userToken) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${userToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem("auth_token");
          }
        })
        .catch(() => {
          localStorage.removeItem("auth_token");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Login failed");
    }

    const data = await res.json();
    localStorage.setItem("auth_token", data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string, role: string = "analyst") => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Registration failed");
    }

    const data = await res.json();
    localStorage.setItem("auth_token", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("admin_token");
    setUser(null);
  };

  const refreshUser = async (): Promise<User | null> => {
    const adminToken = localStorage.getItem("admin_token");
    const userToken = localStorage.getItem("auth_token");
    const token = adminToken || userToken;
    
    if (!token) return null;
    
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        return data.user;
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
