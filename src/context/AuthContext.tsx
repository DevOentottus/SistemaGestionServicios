import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginUser } from "../app/services/authService";

export type User = {
  id_usuario: string;
  username: string;
  rol: string;
  nombres: string;
  apellido_paterno?: string;
  activo: boolean;
};

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión desde localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("sgs_user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("sgs_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<User | null> => {
    try {
      const usuario = await loginUser(username, password);
      if (!usuario) return null;

      const user: User = {
        id_usuario: usuario.id_usuario,
        username: usuario.username,
        rol: usuario.rol,
        nombres: usuario.nombres,
        apellido_paterno: usuario.apellido_paterno,
        activo: usuario.activo,
      };

      setCurrentUser(user);
      localStorage.setItem("sgs_user", JSON.stringify(user));
      return user;
    } catch {
      return null;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("sgs_user");
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        loading,
      }}
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
