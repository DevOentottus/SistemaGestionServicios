import React, { createContext, useContext, useState } from "react";
import { User, Role, usuarios } from "../data/mockData";

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => User | null;
  logout: () => void;
  isAuthenticated: boolean;
  hasAccess: (minRole: Role) => boolean;
}

const roleHierarchy: Record<Role, number> = {
  Administrador: 4,
  Encargado: 3,
  Colaborador: 2,
  Cliente: 1,
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = (username: string, password: string): User | null => {
    const user = usuarios.find(
      (u) => u.username === username && u.password === password && u.activo
    );
    if (user) {
      setCurrentUser(user);
      return user;
    }
    return null;
  };

  const logout = () => setCurrentUser(null);

  const hasAccess = (minRole: Role): boolean => {
    if (!currentUser) return false;
    return roleHierarchy[currentUser.rol] >= roleHierarchy[minRole];
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, login, logout, isAuthenticated: !!currentUser, hasAccess }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}