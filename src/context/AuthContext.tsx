import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { loginUser, setUserContext } from "../app/services/authService";

export type User = {
  id_usuario: number;
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
  /** Verifica si el usuario actual tiene uno de los roles permitidos */
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "sgs_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Restaurar sesión desde localStorage ──
  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as User;
        setCurrentUser(parsed);
        // Restaurar contexto en la base para los triggers
        setUserContext(parsed.id_usuario);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  // ── Login ──
  const login = useCallback(
    async (username: string, password: string): Promise<User | null> => {
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

        // Establecer contexto en la base para triggers de auditoría
        setUserContext(user.id_usuario);

        return user;
      } catch {
        return null;
      }
    },
    []
  );

  // ── Logout ──
  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ── hasRole ──
  const hasRole = useCallback(
    (...roles: string[]): boolean => {
      if (!currentUser) return false;
      return roles.includes(currentUser.rol);
    },
    [currentUser]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        loading,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return ctx;
}
