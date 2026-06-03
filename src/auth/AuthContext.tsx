import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { authApi } from "../api/client";

export type User = {
  id_usuario: number;
  username: string;
  rol: string;
  nombres: string;
  apellido_paterno?: string;
  activo: boolean;
  area_id: number | null;
};

interface AuthContextType {
  currentUser: User | null;
  permisos: string[];
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  hasPermission: (...permisos: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Restaurar sesión desde sessionStorage ──
  useEffect(() => {
    const storedUser = sessionStorage.getItem("auth_user");
    const storedPermisos = sessionStorage.getItem("auth_permisos");

    if (storedUser && storedPermisos) {
      try {
        setCurrentUser(JSON.parse(storedUser));
        setPermisos(JSON.parse(storedPermisos));
      } catch {
        sessionStorage.removeItem("auth_user");
        sessionStorage.removeItem("auth_permisos");
        sessionStorage.removeItem("auth_token");
      }
    }
    setLoading(false);
  }, []);

  // ── Login ──
  const login = useCallback(
    async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await authApi.login(username, password);
        const { token, user, permisos: userPermisos } = response.data.data;

        const authUser: User = {
          id_usuario: user.id_usuario,
          username: user.username,
          rol: user.rol,
          nombres: user.nombres,
          apellido_paterno: user.apellido_paterno ?? undefined,
          activo: user.activo,
          area_id: user.area_id,
        };

        // Guardar en sessionStorage (se borra al cerrar el tab)
        sessionStorage.setItem("auth_token", token);
        sessionStorage.setItem("auth_user", JSON.stringify(authUser));
        sessionStorage.setItem("auth_permisos", JSON.stringify(userPermisos));

        setCurrentUser(authUser);
        setPermisos(userPermisos);

        return { success: true };
      } catch (err: any) {
        const message =
          err.response?.data?.title ||
          err.response?.data?.detail ||
          "Error al iniciar sesión";
        return { success: false, error: message };
      }
    },
    []
  );

  // ── Logout ──
  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    setCurrentUser(null);
    setPermisos([]);
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
    sessionStorage.removeItem("auth_permisos");
  }, []);

  // ── hasPermission ──
  const hasPermission = useCallback(
    (...requiredPermisos: string[]): boolean => {
      if (requiredPermisos.length === 0) return true;
      return requiredPermisos.some((p) => permisos.includes(p));
    },
    [permisos]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        permisos,
        login,
        logout,
        isAuthenticated: !!currentUser,
        loading,
        hasPermission,
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
